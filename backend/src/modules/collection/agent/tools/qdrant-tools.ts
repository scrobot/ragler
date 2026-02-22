import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type { QdrantClientService } from '@infrastructure/qdrant';
import type { LlmService } from '@llm/llm.service';
import { buildAgentTool, type AgentTool } from './tool.interface';

/**
 * Convert a collection ID to its Qdrant collection name.
 */
function toQdrantName(collectionId: string): string {
    return `kb_${collectionId}`;
}

/**
 * Safely stringify large payloads, truncating text fields.
 */
function summarisePoint(point: Record<string, unknown>): Record<string, unknown> {
    const payload = point.payload as Record<string, unknown> | undefined;
    if (!payload) return point;

    const chunk = payload.chunk as Record<string, unknown> | undefined;
    if (chunk?.text && typeof chunk.text === 'string' && chunk.text.length > 500) {
        return {
            ...point,
            payload: {
                ...payload,
                chunk: { ...chunk, text: chunk.text.slice(0, 500) + '…' },
            },
        };
    }
    return point;
}

// ============================================================================
// list_collections
// ============================================================================

const listCollectionsSchema = z.object({});

export function createListCollectionsTool(
    qdrant: QdrantClientService,
): AgentTool<z.infer<typeof listCollectionsSchema>> {
    return buildAgentTool({
        name: 'list_collections',
        description:
            'List all knowledge base collections with point counts. Returns collection IDs and total chunks.',
        schema: listCollectionsSchema,
        parameters: { type: 'object', properties: {}, additionalProperties: false },
        execute: async (): Promise<string> => {
            const client = qdrant.getClient();
            const { collections } = await client.getCollections();

            const kbCollections = collections.filter((c) => c.name.startsWith('kb_'));
            const results = await Promise.all(
                kbCollections.map(async (c) => {
                    const count = await qdrant.countPoints(c.name);
                    return {
                        collectionId: c.name.replace('kb_', ''),
                        qdrantName: c.name,
                        pointCount: count,
                    };
                }),
            );

            return JSON.stringify(results, null, 2);
        },
    });
}

// ============================================================================
// scroll_chunks
// ============================================================================

const scrollChunksSchema = z.object({
    collectionId: z.string().uuid().describe('Collection UUID'),
    limit: z.number().int().min(1).max(50).optional().describe('Max results (default 20)'),
    offset: z.number().int().min(0).optional().describe('Offset for pagination (default 0)'),
    sourceType: z
        .enum(['confluence', 'web', 'manual', 'file'])
        .optional()
        .describe('Filter by source type'),
});

type ScrollChunksInput = z.infer<typeof scrollChunksSchema>;

export function createScrollChunksTool(
    qdrant: QdrantClientService,
): AgentTool<ScrollChunksInput> {
    return buildAgentTool({
        name: 'scroll_chunks',
        description:
            'Browse chunks in a collection with optional filters. Returns paginated list of chunks with content and metadata.',
        schema: scrollChunksSchema,
        parameters: {
            type: 'object',
            properties: {
                collectionId: { type: 'string', format: 'uuid', description: 'Collection UUID' },
                limit: { type: 'number', description: 'Max results (1-50)' },
                offset: { type: 'number', description: 'Offset for pagination' },
                sourceType: {
                    type: 'string',
                    enum: ['confluence', 'web', 'manual', 'file'],
                    description: 'Filter by source type',
                },
            },
            required: ['collectionId'],
            additionalProperties: false,
        },
        execute: async ({ collectionId, limit: rawLimit, offset: rawOffset, sourceType }): Promise<string> => {
            const name = toQdrantName(collectionId);
            const limit = rawLimit ?? 20;
            const offset = rawOffset ?? 0;

            const filter: Record<string, unknown> | undefined = sourceType
                ? { must: [{ key: 'doc.source_type', match: { value: sourceType } }] }
                : undefined;

            const total = await qdrant.countPoints(name, filter);
            const result = await qdrant.scrollWithOrder(name, { filter, limit, offset });
            const points = (result.points as Record<string, unknown>[]).map(summarisePoint);

            return JSON.stringify({ total, returned: points.length, offset, points }, null, 2);
        },
    });
}

// ============================================================================
// search_chunks
// ============================================================================

const searchChunksSchema = z.object({
    collectionId: z.string().uuid().describe('Collection UUID'),
    query: z.string().min(1).describe('Natural language search query'),
    limit: z.number().int().min(1).max(20).optional().describe('Max results (default 5)'),
});

type SearchChunksInput = z.infer<typeof searchChunksSchema>;

export function createSearchChunksTool(
    qdrant: QdrantClientService,
    llm: LlmService,
): AgentTool<SearchChunksInput> {
    return buildAgentTool({
        name: 'search_chunks',
        description:
            'Semantic search across a collection. Embeds the query and finds the most similar chunks. Use for finding specific content or duplicates.',
        schema: searchChunksSchema,
        parameters: {
            type: 'object',
            properties: {
                collectionId: { type: 'string', format: 'uuid', description: 'Collection UUID' },
                query: { type: 'string', description: 'Natural language search query' },
                limit: { type: 'number', description: 'Max results (1-20)' },
            },
            required: ['collectionId', 'query'],
            additionalProperties: false,
        },
        execute: async ({ collectionId, query, limit: rawLimit }): Promise<string> => {
            const name = toQdrantName(collectionId);
            const [embedding] = await llm.generateEmbeddings([query], `agent_search_${collectionId}`);
            const results = await qdrant.search(name, embedding, rawLimit ?? 5);

            const points = (results as Record<string, unknown>[]).map(summarisePoint);
            return JSON.stringify(points, null, 2);
        },
    });
}

// ============================================================================
// get_chunk
// ============================================================================

const getChunkSchema = z.object({
    collectionId: z.string().uuid().describe('Collection UUID'),
    chunkId: z.string().describe('Chunk point ID'),
});

type GetChunkInput = z.infer<typeof getChunkSchema>;

export function createGetChunkDirectTool(
    qdrant: QdrantClientService,
): AgentTool<GetChunkInput> {
    return buildAgentTool({
        name: 'get_chunk',
        description:
            'Retrieve the full payload of a single chunk by its point ID. Returns content, doc metadata, tags, and editor fields.',
        schema: getChunkSchema,
        parameters: {
            type: 'object',
            properties: {
                collectionId: { type: 'string', format: 'uuid', description: 'Collection UUID' },
                chunkId: { type: 'string', description: 'Chunk point ID' },
            },
            required: ['collectionId', 'chunkId'],
            additionalProperties: false,
        },
        execute: async ({ collectionId, chunkId }): Promise<string> => {
            const name = toQdrantName(collectionId);
            const points = await qdrant.getPoints(name, [chunkId]);
            if (!points || points.length === 0) {
                return JSON.stringify({ error: `Chunk ${chunkId} not found` });
            }
            return JSON.stringify(points[0], null, 2);
        },
    });
}

// ============================================================================
// count_chunks
// ============================================================================

const countChunksSchema = z.object({
    collectionId: z.string().uuid().describe('Collection UUID'),
    sourceType: z
        .enum(['confluence', 'web', 'manual', 'file'])
        .optional()
        .describe('Filter by source type'),
});

type CountChunksInput = z.infer<typeof countChunksSchema>;

export function createCountChunksTool(
    qdrant: QdrantClientService,
): AgentTool<CountChunksInput> {
    return buildAgentTool({
        name: 'count_chunks',
        description: 'Count total points in a collection, optionally filtered by source type.',
        schema: countChunksSchema,
        parameters: {
            type: 'object',
            properties: {
                collectionId: { type: 'string', format: 'uuid', description: 'Collection UUID' },
                sourceType: {
                    type: 'string',
                    enum: ['confluence', 'web', 'manual', 'file'],
                    description: 'Filter by source type',
                },
            },
            required: ['collectionId'],
            additionalProperties: false,
        },
        execute: async ({ collectionId, sourceType }): Promise<string> => {
            const name = toQdrantName(collectionId);
            const filter: Record<string, unknown> | undefined = sourceType
                ? { must: [{ key: 'doc.source_type', match: { value: sourceType } }] }
                : undefined;
            const count = await qdrant.countPoints(name, filter);
            return JSON.stringify({ collectionId, count });
        },
    });
}

// ============================================================================
// update_chunk_payload
// ============================================================================

const updateChunkPayloadSchema = z.object({
    collectionId: z.string().uuid().describe('Collection UUID'),
    chunkId: z.string().describe('Chunk point ID'),
    payload: z
        .record(z.unknown())
        .describe('Payload fields to set (merged with existing). Use dot notation for nested, e.g. "chunk.text"'),
});

type UpdateChunkPayloadInput = z.infer<typeof updateChunkPayloadSchema>;

export function createUpdateChunkPayloadTool(
    qdrant: QdrantClientService,
): AgentTool<UpdateChunkPayloadInput> {
    return buildAgentTool({
        name: 'update_chunk_payload',
        description:
            'Update payload fields on a chunk. Use dot notation for nested fields (e.g. "chunk.text", "editor.quality_score"). Merges with existing payload.',
        schema: updateChunkPayloadSchema,
        parameters: {
            type: 'object',
            properties: {
                collectionId: { type: 'string', format: 'uuid', description: 'Collection UUID' },
                chunkId: { type: 'string', description: 'Chunk point ID' },
                payload: {
                    type: 'object',
                    description: 'Fields to set (dot notation for nested)',
                    additionalProperties: true,
                },
            },
            required: ['collectionId', 'chunkId', 'payload'],
            additionalProperties: false,
        },
        execute: async ({ collectionId, chunkId, payload }): Promise<string> => {
            const name = toQdrantName(collectionId);
            await qdrant.updatePayloads(name, [{ id: chunkId, payload }]);
            return JSON.stringify({ success: true, chunkId, updatedFields: Object.keys(payload) });
        },
    });
}

// ============================================================================
// delete_chunks
// ============================================================================

const deleteChunksSchema = z.object({
    collectionId: z.string().uuid().describe('Collection UUID'),
    chunkIds: z.array(z.string()).min(1).max(20).describe('Array of chunk IDs to delete'),
});

type DeleteChunksInput = z.infer<typeof deleteChunksSchema>;

export function createDeleteChunksTool(
    qdrant: QdrantClientService,
): AgentTool<DeleteChunksInput> {
    return buildAgentTool({
        name: 'delete_chunks',
        description:
            'Delete one or more chunks by their point IDs. DESTRUCTIVE — cannot be undone. Max 20 at a time.',
        schema: deleteChunksSchema,
        parameters: {
            type: 'object',
            properties: {
                collectionId: { type: 'string', format: 'uuid', description: 'Collection UUID' },
                chunkIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Chunk IDs to delete (max 20)',
                },
            },
            required: ['collectionId', 'chunkIds'],
            additionalProperties: false,
        },
        execute: async ({ collectionId, chunkIds }): Promise<string> => {
            const name = toQdrantName(collectionId);
            await qdrant.deletePoints(name, chunkIds);
            return JSON.stringify({ success: true, deleted: chunkIds.length, chunkIds });
        },
    });
}

// ============================================================================
// upsert_chunk
// ============================================================================

const upsertChunkSchema = z.object({
    collectionId: z.string().uuid().describe('Collection UUID'),
    chunkId: z.string().optional().describe('Point ID (auto-generated if omitted)'),
    content: z.string().min(1).describe('Chunk text content — will be embedded'),
    sourceType: z
        .enum(['confluence', 'web', 'manual', 'file'])
        .optional()
        .describe('Source type (default manual)'),
    tags: z.array(z.string()).optional().describe('Tags'),
    headingPath: z.array(z.string()).optional().describe('Heading breadcrumb'),
});

type UpsertChunkInput = z.infer<typeof upsertChunkSchema>;

export function createUpsertChunkTool(
    qdrant: QdrantClientService,
    llm: LlmService,
): AgentTool<UpsertChunkInput> {
    return buildAgentTool({
        name: 'upsert_chunk',
        description:
            'Create or replace a chunk. Generates embedding for the content automatically. Use for rewrites (same chunkId) or creating new chunks.',
        schema: upsertChunkSchema,
        parameters: {
            type: 'object',
            properties: {
                collectionId: { type: 'string', format: 'uuid', description: 'Collection UUID' },
                chunkId: { type: 'string', description: 'Point ID (auto-gen if omitted)' },
                content: { type: 'string', description: 'Text content' },
                sourceType: { type: 'string', enum: ['confluence', 'web', 'manual', 'file'] },
                tags: { type: 'array', items: { type: 'string' } },
                headingPath: { type: 'array', items: { type: 'string' } },
            },
            required: ['collectionId', 'content'],
            additionalProperties: false,
        },
        execute: async ({
            collectionId,
            chunkId,
            content,
            sourceType: rawSourceType,
            tags: rawTags,
            headingPath: rawHeadingPath,
        }): Promise<string> => {
            const name = toQdrantName(collectionId);
            const id = chunkId || uuidv4();
            const sourceType = rawSourceType ?? 'manual';
            const tags = rawTags ?? [];
            const headingPath = rawHeadingPath ?? [];

            const [embedding] = await llm.generateEmbeddings([content], `agent_upsert_${id}`);

            const payload: Record<string, unknown> = {
                doc: {
                    source_type: sourceType,
                    source_id: `agent_${collectionId}`,
                    url: `manual://agent/${collectionId}/${id}`,
                    space_key: null,
                    title: null,
                    revision: 1,
                    last_modified_at: new Date().toISOString(),
                    last_modified_by: 'agent',
                    filename: null,
                    file_size: null,
                    mime_type: null,
                    ingest_date: new Date().toISOString(),
                },
                chunk: {
                    id,
                    index: 0,
                    type: 'knowledge',
                    heading_path: headingPath,
                    section: headingPath.length > 0 ? headingPath.join(' / ') : null,
                    text: content,
                    content_hash: `sha256:${Buffer.from(content).toString('base64').slice(0, 32)}`,
                    lang: 'en',
                },
                tags,
                acl: { visibility: 'internal', allowed_groups: [], allowed_users: [] },
            };

            await qdrant.upsertPoints(name, [{ id, vector: embedding, payload }]);

            return JSON.stringify({ success: true, chunkId: id, contentLength: content.length });
        },
    });
}
