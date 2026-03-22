import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ChunkingConfigSchema } from './chunking-config.dto';

export const IngestManualSchema = z.object({
    content: z
        .string()
        .min(1, 'Content cannot be empty')
        .max(102400, 'Content exceeds maximum length of 100KB'),
    chunkingConfig: ChunkingConfigSchema,
});

export class IngestManualDto extends createZodDto(IngestManualSchema) { }
