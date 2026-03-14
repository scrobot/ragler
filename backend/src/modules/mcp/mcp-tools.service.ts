import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { z } from 'zod';
import { VectorService } from '@vector/vector.service';
import { CollectionService } from '@collection/collection.service';
import { IngestService } from '@ingest/ingest.service';
import { LlmService } from '@llm/llm.service';
import { QdrantClientService } from '@infrastructure/qdrant';
import type { SearchResultDto } from '@vector/dto/vector.dto';
import {
  ChunkTypeSchema,
  SourceTypeSchema,
  generateChunkId,
  formatSection,
  createDefaultAcl,
} from '@modules/vector/dto/payload.dto';
import type { DocMetadata, QdrantPayload } from '@modules/vector/dto/payload.dto';
import { computeContentHash, detectLanguage } from '@llm/utils/text-normalizer';

/**
 * MCP tool definitions and handlers.
 * Calls VectorService / CollectionService directly — no HTTP round-trip.
 */

// ---------------------------------------------------------------------------
// Zod schemas for tool input validation
// ---------------------------------------------------------------------------
const SearchInputSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  collection_id: z.string().uuid('Invalid collection ID'),
  limit: z.number().int().min(1).max(100).optional().default(10),
  filters: z
    .object({
      source_types: z.array(z.enum(['web', 'manual', 'file'])).optional(),
      chunk_types: z
        .array(z.enum(['knowledge', 'navigation', 'table_row', 'glossary', 'faq', 'code']))
        .optional(),
      exclude_navigation: z.boolean().optional().default(true),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});

const GetCollectionInputSchema = z.object({
  collection_id: z.string().uuid('Invalid collection ID'),
});

const InsertChunksSourceSchema = z.object({
  url: z.string().min(1, 'Source URL is required'),
  title: z.string().nullable().optional().default(null),
  source_type: SourceTypeSchema,
});

const InsertChunkItemSchema = z.object({
  text: z.string().min(1, 'Chunk text is required'),
  type: ChunkTypeSchema.optional().default('knowledge'),
  heading_path: z.array(z.string()).optional().default([]),
  tags: z.array(z.string().min(1).max(50)).max(12).optional().default([]),
});

const InsertChunksInputSchema = z.object({
  collection_id: z.string().uuid('Invalid collection ID'),
  source: InsertChunksSourceSchema,
  chunks: z.array(InsertChunkItemSchema).min(1, 'At least one chunk is required').max(500, 'Maximum 500 chunks per request'),
  user_id: z.string().min(1, 'User ID is required'),
});

const IngestSourceTypeSchema = z.enum(['web', 'manual', 'file']);

const IngestMaterialInputSchema = z.object({
  source_type: IngestSourceTypeSchema,
  url: z.string().url('Invalid URL format').optional(),
  content: z.string().min(1).max(102400).optional(),
  file_base64: z.string().optional(),
  filename: z.string().optional(),
  user_id: z.string().min(1, 'User ID is required'),
  chunking_config: z.object({
    method: z.enum(['llm', 'character']).default('llm'),
    chunk_size: z.number().int().min(100).max(10000).default(1000),
    overlap: z.number().int().min(0).max(2000).default(200),
  }).optional(),
}).superRefine((data, ctx) => {
  if (data.source_type === 'web' && !data.url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'url is required when source_type is "web"',
      path: ['url'],
    });
  }
  if (data.source_type === 'manual' && !data.content) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'content is required when source_type is "manual"',
      path: ['content'],
    });
  }
  if (data.source_type === 'file') {
    if (!data.file_base64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'file_base64 is required when source_type is "file"',
        path: ['file_base64'],
      });
    }
    if (!data.filename) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'filename is required when source_type is "file"',
        path: ['filename'],
      });
    }
  }
});

// ---------------------------------------------------------------------------
// MCP tool descriptors (JSON Schema for MCP SDK)
// ---------------------------------------------------------------------------
export const SEARCH_KNOWLEDGE_TOOL = {
  name: 'search_knowledge',
  description:
    'Search across knowledge collections with semantic search. Returns relevant chunks with structured metadata including document hierarchy, tags, and source information.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: { type: 'string' as const, description: 'Natural language search query' },
      collection_id: {
        type: 'string' as const,
        description: 'UUID of specific collection to search',
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of results to return (1-100, default 10)',
        minimum: 1,
        maximum: 100,
        default: 10,
      },
      filters: {
        type: 'object' as const,
        description: 'Optional filters to refine search results',
        properties: {
          source_types: {
            type: 'array' as const,
            items: { type: 'string' as const, enum: ['web', 'manual'] },
            description: 'Filter by source type',
          },
          chunk_types: {
            type: 'array' as const,
            items: {
              type: 'string' as const,
              enum: ['knowledge', 'navigation', 'table_row', 'glossary', 'faq', 'code'],
            },
            description: 'Filter by chunk type',
          },
          exclude_navigation: {
            type: 'boolean' as const,
            description: 'Exclude navigation chunks (default: true)',
          },
          tags: {
            type: 'array' as const,
            items: { type: 'string' as const },
            description: 'Filter by LLM-extracted tags',
          },
        },
      },
    },
    required: ['query', 'collection_id'] as string[],
  },
};

export const LIST_COLLECTIONS_TOOL = {
  name: 'list_collections',
  description: 'List all available knowledge collections with their metadata',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [] as string[],
  },
};

export const GET_COLLECTION_INFO_TOOL = {
  name: 'get_collection_info',
  description: 'Get detailed information about a specific knowledge collection',
  inputSchema: {
    type: 'object' as const,
    properties: {
      collection_id: { type: 'string' as const, description: 'UUID of the collection' },
    },
    required: ['collection_id'] as string[],
  },
};

export const INSERT_CHUNKS_TOOL = {
  name: 'insert_chunks',
  description:
    'Insert pre-processed chunks directly into a knowledge collection. Generates embeddings and performs atomic replacement (deletes existing chunks from the same source before inserting). Ideal for agents that handle their own chunking.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      collection_id: {
        type: 'string' as const,
        description: 'UUID of the target collection',
      },
      source: {
        type: 'object' as const,
        description: 'Source document metadata',
        properties: {
          url: { type: 'string' as const, description: 'Original source URL' },
          title: { type: 'string' as const, description: 'Document title (optional)' },
          source_type: {
            type: 'string' as const,
            enum: ['web', 'manual', 'file'],
            description: 'Type of source',
          },
        },
        required: ['url', 'source_type'] as string[],
      },
      chunks: {
        type: 'array' as const,
        description: 'Array of chunks to insert (max 500)',
        items: {
          type: 'object' as const,
          properties: {
            text: { type: 'string' as const, description: 'Chunk text content' },
            type: {
              type: 'string' as const,
              enum: ['knowledge', 'navigation', 'table_row', 'glossary', 'faq', 'code'],
              description: 'Chunk type (default: knowledge)',
            },
            heading_path: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description: 'Heading hierarchy path',
            },
            tags: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description: 'Topic tags (max 12)',
            },
          },
          required: ['text'] as string[],
        },
        minItems: 1,
        maxItems: 500,
      },
      user_id: {
        type: 'string' as const,
        description: 'User or agent identifier for audit',
      },
    },
    required: ['collection_id', 'source', 'chunks', 'user_id'] as string[],
  },
};

export const INGEST_MATERIAL_TOOL = {
  name: 'ingest_material',
  description:
    'Submit material for ingestion through the standard pipeline. Creates a session, chunks the content, and waits for user review before publishing. Supports web URLs, manual text, and file uploads (base64).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      source_type: {
        type: 'string' as const,
        enum: ['web', 'manual', 'file'],
        description: 'Type of material to ingest',
      },
      url: {
        type: 'string' as const,
        description: 'URL to ingest (required when source_type is "web")',
      },
      content: {
        type: 'string' as const,
        description: 'Text content to ingest (required when source_type is "manual", max 100KB)',
      },
      file_base64: {
        type: 'string' as const,
        description: 'Base64-encoded file content (required when source_type is "file", max 10MB)',
      },
      filename: {
        type: 'string' as const,
        description: 'Original filename with extension (required when source_type is "file")',
      },
      user_id: {
        type: 'string' as const,
        description: 'User or agent identifier for session tracking',
      },
      chunking_config: {
        type: 'object' as const,
        description: 'Optional chunking configuration',
        properties: {
          method: {
            type: 'string' as const,
            enum: ['llm', 'character'],
            description: 'Chunking method (default: llm)',
          },
          chunk_size: {
            type: 'number' as const,
            description: 'Target chunk size for character method (100-10000, default 1000)',
          },
          overlap: {
            type: 'number' as const,
            description: 'Overlap between chunks (0-2000, default 200)',
          },
        },
      },
    },
    required: ['source_type', 'user_id'] as string[],
  },
};

// ---------------------------------------------------------------------------
// MCP response helpers
// ---------------------------------------------------------------------------
interface McpToolResponse {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

function textResponse(text: string): McpToolResponse {
  return { content: [{ type: 'text', text }] };
}

function errorResponse(message: string): McpToolResponse {
  return { content: [{ type: 'text', text: message }], isError: true };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
@Injectable()
export class McpToolsService {
  private readonly logger = new Logger(McpToolsService.name);

  constructor(
    private readonly vectorService: VectorService,
    private readonly collectionService: CollectionService,
    private readonly ingestService: IngestService,
    private readonly llmService: LlmService,
    private readonly qdrantClient: QdrantClientService,
  ) {}

  /** All tool descriptors for MCP ListTools. */
  listTools() {
    return [
      SEARCH_KNOWLEDGE_TOOL,
      LIST_COLLECTIONS_TOOL,
      GET_COLLECTION_INFO_TOOL,
      INSERT_CHUNKS_TOOL,
      INGEST_MATERIAL_TOOL,
    ];
  }

  /** Dispatch a tool call by name. */
  async callTool(name: string, args: unknown): Promise<McpToolResponse> {
    switch (name) {
      case 'search_knowledge':
        return this.handleSearchKnowledge(args);
      case 'list_collections':
        return this.handleListCollections();
      case 'get_collection_info':
        return this.handleGetCollectionInfo(args);
      case 'insert_chunks':
        return this.handleInsertChunks(args);
      case 'ingest_material':
        return this.handleIngestMaterial(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  // -------------------------------------------------------------------------
  // Tool handlers
  // -------------------------------------------------------------------------

  private async handleSearchKnowledge(args: unknown): Promise<McpToolResponse> {
    try {
      const input = SearchInputSchema.parse(args);

      const response = await this.vectorService.search({
        query: input.query,
        collectionId: input.collection_id,
        limit: input.limit,
        filters: input.filters,
      });

      const resultsText = response.results
        .map((r: SearchResultDto, idx: number) => this.formatSearchResult(r, idx))
        .join('\n');

      const summary = [
        `# Search Results for "${response.query}"`,
        '',
        `Found ${response.total} results:`,
        '',
        resultsText,
      ].join('\n');

      return textResponse(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error({ event: 'mcp_search_error', error: message });
      return errorResponse(`Error searching knowledge: ${message}`);
    }
  }

  private async handleListCollections(): Promise<McpToolResponse> {
    try {
      const response = await this.collectionService.findAll();
      return textResponse(JSON.stringify(response, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error({ event: 'mcp_list_collections_error', error: message });
      return errorResponse(`Error listing collections: ${message}`);
    }
  }

  private async handleGetCollectionInfo(args: unknown): Promise<McpToolResponse> {
    try {
      const input = GetCollectionInputSchema.parse(args);
      const collection = await this.collectionService.findOne(input.collection_id);
      return textResponse(JSON.stringify(collection, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error({ event: 'mcp_get_collection_error', error: message });
      return errorResponse(`Error getting collection info: ${message}`);
    }
  }

  private async handleInsertChunks(args: unknown): Promise<McpToolResponse> {
    try {
      const input = InsertChunksInputSchema.parse(args);
      const startTime = Date.now();

      const collectionName = `kb_${input.collection_id}`;

      // Verify collection exists
      const collectionExists = await this.qdrantClient.collectionExists(collectionName);
      if (!collectionExists) {
        return errorResponse(`Collection ${input.collection_id} not found`);
      }

      const sourceId = crypto.createHash('md5').update(input.source.url).digest('hex');
      const now = new Date().toISOString();

      // Build doc metadata
      const docMetadata: DocMetadata = {
        source_type: input.source.source_type,
        source_id: sourceId,
        url: input.source.url,
        space_key: null,
        title: input.source.title ?? null,
        revision: 1,
        last_modified_at: now,
        last_modified_by: input.user_id,
        filename: null,
        file_size: null,
        mime_type: null,
        ingest_date: now,
      };

      // Build QdrantPayload for each chunk
      const payloads: QdrantPayload[] = input.chunks.map((chunk, index) => {
        const contentHash = computeContentHash(chunk.text);
        const lang = detectLanguage(chunk.text);
        const chunkId = generateChunkId(sourceId, contentHash);
        const section = formatSection(chunk.heading_path);

        return {
          doc: docMetadata,
          chunk: {
            id: chunkId,
            index,
            type: chunk.type,
            heading_path: chunk.heading_path,
            section,
            text: chunk.text,
            content_hash: contentHash,
            lang,
          },
          tags: chunk.tags,
          acl: createDefaultAcl(),
        };
      });

      // Generate embeddings
      const texts = payloads.map((p) => p.chunk.text);
      const embeddings = await this.llmService.generateEmbeddings(texts);

      // Build Qdrant points
      const points = payloads.map((payload, index) => ({
        id: payload.chunk.id,
        vector: embeddings[index],
        payload: payload as Record<string, unknown>,
      }));

      // Atomic replacement: delete old chunks from same source, then upsert new
      await this.qdrantClient.deletePointsByFilter(collectionName, {
        must: [{ key: 'doc.source_id', match: { value: sourceId } }],
      });

      await this.qdrantClient.upsertPoints(collectionName, points);

      const durationMs = Date.now() - startTime;

      this.logger.log({
        event: 'mcp_insert_chunks_success',
        collectionId: input.collection_id,
        sourceId,
        sourceUrl: input.source.url,
        chunkCount: points.length,
        userId: input.user_id,
        durationMs,
      });

      return textResponse(JSON.stringify({
        success: true,
        collection_id: input.collection_id,
        source_id: sourceId,
        inserted_chunks: points.length,
        duration_ms: durationMs,
      }, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error({ event: 'mcp_insert_chunks_error', error: message });
      return errorResponse(`Error inserting chunks: ${message}`);
    }
  }

  private async handleIngestMaterial(args: unknown): Promise<McpToolResponse> {
    try {
      const input = IngestMaterialInputSchema.parse(args);

      const chunkingConfig = input.chunking_config
        ? {
            method: input.chunking_config.method as 'llm' | 'character',
            chunkSize: input.chunking_config.chunk_size,
            overlap: input.chunking_config.overlap,
          }
        : undefined;

      let result;

      switch (input.source_type) {
        case 'web': {
          result = await this.ingestService.ingestWeb(
            { url: input.url!, chunkingConfig },
            input.user_id,
          );
          break;
        }

        case 'manual': {
          result = await this.ingestService.ingestManual(
            { content: input.content!, chunkingConfig },
            input.user_id,
          );
          break;
        }

        case 'file': {
          const buffer = Buffer.from(input.file_base64!, 'base64');
          const file = {
            buffer,
            originalname: input.filename!,
            size: buffer.length,
            mimetype: this.guessMimeType(input.filename!),
          } as Express.Multer.File;

          result = await this.ingestService.ingestFile(file, input.user_id, chunkingConfig);
          break;
        }
      }

      this.logger.log({
        event: 'mcp_ingest_material_success',
        sourceType: input.source_type,
        sessionId: result.sessionId,
        userId: input.user_id,
      });

      return textResponse(JSON.stringify({
        success: true,
        session_id: result.sessionId,
        source_type: result.sourceType,
        source_url: result.sourceUrl,
        status: result.status,
        created_at: result.createdAt,
        message: 'Session created. Content has been chunked and is ready for review in the Ragler UI.',
      }, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error({ event: 'mcp_ingest_material_error', error: message });
      return errorResponse(`Error ingesting material: ${message}`);
    }
  }

  // -------------------------------------------------------------------------
  // Formatting
  // -------------------------------------------------------------------------

  private formatSearchResult(r: SearchResultDto, idx: number): string {
    const lines = [
      `## Result ${idx + 1} (Score: ${r.score.toFixed(3)})`,
      '',
      '**Content:**',
      r.content,
      '',
      `**Citation:** ${r.doc.title || 'Untitled'}`,
      `**Path:** ${r.chunk.heading_path.join(' > ') || 'N/A'}`,
      `**URL:** ${r.doc.url}`,
      `**Type:** ${r.chunk.type} (${r.doc.source_type})`,
      `**Language:** ${r.chunk.lang}`,
      r.tags.length > 0 ? `**Tags:** ${r.tags.join(', ')}` : '',
      '',
      '---',
      '',
    ];

    return lines.filter(Boolean).join('\n');
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private guessMimeType(filename: string): string {
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.html': 'text/html',
      '.htm': 'text/html',
      '.xml': 'application/xml',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return mimeMap[ext] ?? 'application/octet-stream';
  }
}
