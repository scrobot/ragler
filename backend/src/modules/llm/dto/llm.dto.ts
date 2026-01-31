import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const RefineScenarioEnum = z.enum([
  'simplify',
  'clarify_terms',
  'add_examples',
  'rewrite_for_audience',
]);
export type RefineScenario = z.infer<typeof RefineScenarioEnum>;

export const RefineRequestSchema = z.object({
  scenario: RefineScenarioEnum,
  chunkId: z.string().min(1, 'Chunk ID is required'),
  targetAudience: z.string().optional(),
});

export class RefineRequestDto extends createZodDto(RefineRequestSchema) {}

export const RefineResponseSchema = z.object({
  chunkId: z.string(),
  scenario: RefineScenarioEnum,
  originalText: z.string(),
  refinedText: z.string(),
  applied: z.boolean(),
});

export type RefineResponseDto = z.infer<typeof RefineResponseSchema>;

export const ChunkRequestSchema = z.object({
  content: z.string().min(1, 'Content is required'),
});

export class ChunkRequestDto extends createZodDto(ChunkRequestSchema) {}

export const ChunkResponseSchema = z.object({
  chunks: z.array(z.string()),
});

export type ChunkResponseDto = z.infer<typeof ChunkResponseSchema>;

export const EmbeddingRequestSchema = z.object({
  text: z.string().min(1, 'Text is required'),
});

export class EmbeddingRequestDto extends createZodDto(EmbeddingRequestSchema) {}

export const EmbeddingResponseSchema = z.object({
  embedding: z.array(z.number()),
  dimensions: z.number().int().positive(),
});

export type EmbeddingResponseDto = z.infer<typeof EmbeddingResponseSchema>;
