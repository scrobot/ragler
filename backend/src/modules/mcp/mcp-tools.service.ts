import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { VectorService } from '@vector/vector.service';
import { CollectionService } from '@collection/collection.service';
import type { SearchResultDto } from '@vector/dto/vector.dto';

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
      source_types: z.array(z.enum(['confluence', 'web', 'manual', 'file'])).optional(),
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
            items: { type: 'string' as const, enum: ['confluence', 'web', 'manual'] },
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
  ) {}

  /** All tool descriptors for MCP ListTools. */
  listTools() {
    return [SEARCH_KNOWLEDGE_TOOL, LIST_COLLECTIONS_TOOL, GET_COLLECTION_INFO_TOOL];
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
}
