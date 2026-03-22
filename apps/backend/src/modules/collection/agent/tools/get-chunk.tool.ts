import { z } from 'zod';
import type { ChunkService } from '../../chunk.service';
import type { EditorChunkResponse } from '../../dto';
import { buildAgentTool, type AgentTool } from './tool.interface';

/**
 * Create the get_chunk_content tool
 * Retrieves chunk content and metadata
 */
const getChunkSchema = z.object({
  collectionId: z.string().uuid().describe('Collection UUID'),
  chunkId: z.string().describe('Chunk ID to retrieve'),
});

type GetChunkInput = z.infer<typeof getChunkSchema>;

export function createGetChunkTool(chunkService: ChunkService): AgentTool<GetChunkInput> {
  return buildAgentTool({
    name: 'get_chunk_content',
    description:
      'Retrieve the full content and metadata of a specific chunk by ID. Use this to inspect chunk details before suggesting operations.',
    schema: getChunkSchema,
    parameters: {
      type: 'object',
      properties: {
        collectionId: { type: 'string', format: 'uuid', description: 'Collection UUID' },
        chunkId: { type: 'string', description: 'Chunk ID to retrieve' },
      },
      required: ['collectionId', 'chunkId'],
      additionalProperties: false,
    },
    execute: async ({ collectionId, chunkId }): Promise<string> => {
      try {
        const chunk = await chunkService.getChunk(collectionId, chunkId);

        return JSON.stringify(
          {
            id: chunk.id,
            content: chunk.content,
            type: chunk.chunk.type,
            headingPath: chunk.chunk.heading_path,
            section: chunk.chunk.section,
            tags: chunk.tags,
            position: chunk.editor?.position,
            qualityScore: chunk.editor?.quality_score,
            qualityIssues: chunk.editor?.quality_issues,
            editCount: chunk.editor?.edit_count,
            contentLength: chunk.content.length,
          },
          null,
          2,
        );
      } catch (error) {
        return JSON.stringify({
          error: `Failed to get chunk: ${error instanceof Error ? error.message : 'Unknown error'}`,
          chunkId,
        });
      }
    },
  });
}

/**
 * Create the get_chunks_context tool
 * Retrieves multiple chunks for context analysis
 */
const getChunksContextSchema = z.object({
  collectionId: z.string().uuid().describe('Collection UUID'),
  chunkIds: z.array(z.string()).describe('Array of chunk IDs to retrieve'),
});

type GetChunksContextInput = z.infer<typeof getChunksContextSchema>;

export function createGetChunksContextTool(
  chunkService: ChunkService,
): AgentTool<GetChunksContextInput> {
  return buildAgentTool({
    name: 'get_chunks_context',
    description:
      'Retrieve content and metadata for multiple chunks. Useful for analyzing surrounding context when considering merge operations.',
    schema: getChunksContextSchema,
    parameters: {
      type: 'object',
      properties: {
        collectionId: { type: 'string', format: 'uuid', description: 'Collection UUID' },
        chunkIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of chunk IDs to retrieve',
        },
      },
      required: ['collectionId', 'chunkIds'],
      additionalProperties: false,
    },
    execute: async ({ collectionId, chunkIds }): Promise<string> => {
      try {
        const chunks = await Promise.all(
          chunkIds.map((id: string) =>
            chunkService.getChunk(collectionId, id).catch(() => null),
          ),
        );

        const results = chunks
          .filter((c): c is EditorChunkResponse => c !== null)
          .map((chunk) => ({
            id: chunk.id,
            content: chunk.content,
            position: chunk.editor?.position,
            type: chunk.chunk.type,
          }));

        return JSON.stringify(results, null, 2);
      } catch (error) {
        return JSON.stringify({
          error: `Failed to get chunks: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    },
  });
}
