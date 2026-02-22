import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ChunkingConfigSchema } from './chunking-config.dto';

export const IngestConfluenceSchema = z
    .object({
        url: z.preprocess(
            (val) => (val === '' ? undefined : val),
            z.string().url('Invalid URL format').optional(),
        ),
        pageId: z.preprocess(
            (val) => (val === '' ? undefined : val),
            z.string().regex(/^\d+$/, 'Page ID must be numeric').optional(),
        ),
        chunkingConfig: ChunkingConfigSchema,
    })
    .refine((data) => !!data.url || !!data.pageId, {
        message: 'Either URL or Page ID must be provided',
    });

export class IngestConfluenceDto extends createZodDto(IngestConfluenceSchema) { }
