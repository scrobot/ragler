import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ChunkingConfigSchema = z.object({
    method: z.enum(['llm', 'character']).default('llm'),
    chunkSize: z.number().int().min(100).max(10000).default(1000),
    overlap: z.number().int().min(0).max(2000).default(200),
}).optional();

export type ChunkingConfig = z.infer<typeof ChunkingConfigSchema>;
