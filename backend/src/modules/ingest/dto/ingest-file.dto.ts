import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const IngestFileSchema = z.object({
    // File comes via multipart/form-data, no body fields needed
    // The actual file is handled by multer interceptor
});

export class IngestFileDto extends createZodDto(IngestFileSchema) { }
