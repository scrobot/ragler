import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const IngestWebSchema = z.object({
    url: z.string().url('Invalid URL format'),
});

export class IngestWebDto extends createZodDto(IngestWebSchema) { }
