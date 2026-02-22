import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const SourceTypeEnum = z.enum(['confluence', 'web', 'manual', 'file']);
export type SourceType = z.infer<typeof SourceTypeEnum>;

export * from './ingest-confluence.dto';
export * from './ingest-web.dto';
export * from './ingest-manual.dto';

// Keeping IngestRequestDto for now if referenced elsewhere, but marked as deprecated or for potential refactoring
// Actually, based on plan, we are replacing the unified endpoint. Use caution.
// I'll keep the response DTO.

export const IngestResponseSchema = z.object({
  sessionId: z.string(),
  sourceType: SourceTypeEnum,
  sourceUrl: z.string(),
  status: z.string(),
  createdAt: z.string(),
});

export class IngestResponseDto extends createZodDto(IngestResponseSchema) { }
