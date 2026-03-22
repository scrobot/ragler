import { z } from 'zod';

// --- Chunking config (shared between web and manual ingest) ---
export const ChunkingConfigSchema = z.object({
  method: z.enum(['llm', 'character']).default('llm'),
  chunkSize: z.number().int().min(100).max(10000).default(1000),
  overlap: z.number().int().min(0).max(2000).default(200),
}).optional();

export type ChunkingConfig = z.infer<typeof ChunkingConfigSchema>;

// --- Source type enum ---
export const SourceTypeEnum = z.enum(['web', 'manual', 'file']);
export type SourceType = z.infer<typeof SourceTypeEnum>;

// --- Ingest requests ---
export const IngestWebSchema = z.object({
  url: z.string().url('Invalid URL format'),
  chunkingConfig: ChunkingConfigSchema,
});

export type IngestWebInput = z.infer<typeof IngestWebSchema>;

export const IngestManualSchema = z.object({
  content: z
    .string()
    .min(1, 'Content cannot be empty')
    .max(102400, 'Content exceeds maximum length of 100KB'),
  chunkingConfig: ChunkingConfigSchema,
});

export type IngestManualInput = z.infer<typeof IngestManualSchema>;

// --- Ingest response ---
export const IngestResponseSchema = z.object({
  sessionId: z.string(),
  sourceType: SourceTypeEnum,
  sourceUrl: z.string(),
  status: z.string(),
  createdAt: z.string(),
});

export type IngestResponse = z.infer<typeof IngestResponseSchema>;
