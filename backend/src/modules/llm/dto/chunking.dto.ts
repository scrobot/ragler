import { z } from 'zod';

// Re-export ChunkDto from session module for use in LLM service
export { ChunkDto, ChunkSchema } from '@modules/session/dto/session.dto';

/**
 * Schema for a single chunk item as returned by the LLM.
 * Uses snake_case (is_dirty) to match LLM JSON output format.
 */
export const LlmChunkItemSchema = z.object({
  id: z.string().regex(/^temp_\d+$/, 'Chunk ID must be in format temp_N'),
  text: z.string().min(1, 'Chunk text cannot be empty'),
  is_dirty: z.boolean(),
});

export type LlmChunkItem = z.infer<typeof LlmChunkItemSchema>;

/**
 * Schema for the full LLM chunking response.
 * This is what the LLM returns in its structured output.
 */
export const LlmChunkResponseSchema = z.object({
  chunks: z.array(LlmChunkItemSchema).min(1, 'At least one chunk is required'),
});

export type LlmChunkResponse = z.infer<typeof LlmChunkResponseSchema>;
