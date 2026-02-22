import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ChunkingConfigSchema } from './chunking-config.dto';

export const IngestWebSchema = z.object({
    url: z.string().url('Invalid URL format'),
    chunkingConfig: ChunkingConfigSchema,
});

export class IngestWebDto extends createZodDto(IngestWebSchema) { }
