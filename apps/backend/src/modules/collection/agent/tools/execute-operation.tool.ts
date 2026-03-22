import { z } from 'zod';
import type { ChunkService } from '../../chunk.service';
import { buildAgentTool, type AgentTool } from './tool.interface';

/**
 * Create the execute_operation tool
 * Executes an approved operation on a chunk
 *
 * IMPORTANT: This tool should only be called after the user has approved
 * the operation. The agent should always present the operation for approval
 * before executing.
 */
export function createExecuteOperationTool(
  chunkService: ChunkService,
  getApprovedOperations: () => Set<string>,
): AgentTool<ExecuteOperationInput> {
  return buildAgentTool({
    name: 'execute_operation',
    description:
      'Execute an approved chunk operation. ONLY call this after the user has explicitly approved the operation. Operations include: SPLIT, MERGE, REWRITE, DELETE, REORDER.',
    schema: executeOperationSchema,
    parameters: {
      type: 'object',
      properties: {
        collectionId: { type: 'string', format: 'uuid', description: 'Collection UUID' },
        operationId: {
          type: 'string',
          format: 'uuid',
          description: 'Operation ID from suggest_operation (must be approved)',
        },
        operationType: {
          type: 'string',
          enum: ['SPLIT', 'MERGE', 'REWRITE', 'DELETE', 'REORDER'],
          description: 'Type of operation to execute',
        },
        chunkId: { type: 'string', description: 'Primary chunk ID for the operation' },
        userId: { type: 'string', description: 'User ID executing the operation' },
        params: {
          type: 'object',
          description:
            'Operation-specific parameters: splitPoints/splitBlocks for SPLIT, mergeWithIds for MERGE, suggestedContent for REWRITE, positions for REORDER',
          additionalProperties: true,
        },
      },
      required: ['collectionId', 'operationId', 'operationType', 'chunkId', 'userId', 'params'],
      additionalProperties: false,
    },
    execute: async ({
      collectionId,
      operationId,
      operationType,
      chunkId,
      userId,
      params,
    }): Promise<string> => {
      const approvedOps = getApprovedOperations();
      if (!approvedOps.has(operationId)) {
        return JSON.stringify({
          success: false,
          error: 'Operation not approved. Please ask the user to approve this operation first.',
          operationId,
        });
      }

      try {
        let result: unknown;

        switch (operationType) {
          case 'SPLIT': {
            const splitDto = params.splitPoints
              ? { splitPoints: params.splitPoints as number[] }
              : { newTextBlocks: params.splitBlocks as string[] };

            result = await chunkService.splitChunk(collectionId, chunkId, splitDto, userId);
            break;
          }

          case 'MERGE': {
            if (!params.mergeWithIds || !Array.isArray(params.mergeWithIds)) {
              throw new Error('mergeWithIds required for MERGE operation');
            }
            result = await chunkService.mergeChunks(
              collectionId,
              {
                chunkIds: [chunkId, ...params.mergeWithIds],
                separator: (params.separator as string) || '\n\n',
              },
              userId,
            );
            break;
          }

          case 'REWRITE': {
            if (!params.suggestedContent) {
              throw new Error('suggestedContent required for REWRITE operation');
            }
            result = await chunkService.updateChunk(
              collectionId,
              chunkId,
              { content: params.suggestedContent as string },
              userId,
            );
            break;
          }

          case 'DELETE': {
            await chunkService.deleteChunk(collectionId, chunkId, userId);
            result = { deleted: true, chunkId };
            break;
          }

          case 'REORDER': {
            if (!params.positions || !Array.isArray(params.positions)) {
              throw new Error('positions required for REORDER operation');
            }
            await chunkService.reorderChunks(
              collectionId,
              {
                chunkPositions: params.positions as Array<{
                  chunkId: string;
                  position: number;
                }>,
              },
              userId,
            );
            result = { reordered: true, count: params.positions.length };
            break;
          }

          default:
            throw new Error(`Unknown operation type: ${operationType}`);
        }

        return JSON.stringify(
          {
            success: true,
            operationId,
            operationType,
            chunkId,
            result,
          },
          null,
          2,
        );
      } catch (error) {
        return JSON.stringify({
          success: false,
          operationId,
          operationType,
          chunkId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });
}

const executeOperationSchema = z.object({
  collectionId: z.string().uuid().describe('Collection UUID'),
  operationId: z
    .string()
    .uuid()
    .describe('Operation ID from suggest_operation (must be approved)'),
  operationType: z
    .enum(['SPLIT', 'MERGE', 'REWRITE', 'DELETE', 'REORDER'])
    .describe('Type of operation to execute'),
  chunkId: z.string().describe('Primary chunk ID for the operation'),
  userId: z.string().describe('User ID executing the operation'),
  params: z
    .record(z.unknown())
    .describe(
      'Operation-specific parameters: splitPoints/splitBlocks for SPLIT, mergeWithIds for MERGE, suggestedContent for REWRITE, positions for REORDER',
    ),
});

type ExecuteOperationInput = z.infer<typeof executeOperationSchema>;
