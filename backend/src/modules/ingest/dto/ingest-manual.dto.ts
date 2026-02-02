import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const IngestManualSchema = z.object({
    content: z
        .string()
        .min(1, 'Content cannot be empty')
        .max(102400, 'Content exceeds maximum length of 100KB'),
});

export class IngestManualDto extends createZodDto(IngestManualSchema) { }
