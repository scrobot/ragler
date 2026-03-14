import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const SourceTypeEnum = z.enum(['web', 'manual', 'file']);
export type SourceType = z.infer<typeof SourceTypeEnum>;

export * from './ingest-web.dto';
export * from './ingest-manual.dto';

export const IngestResponseSchema = z.object({
  sessionId: z.string(),
  sourceType: SourceTypeEnum,
  sourceUrl: z.string(),
  status: z.string(),
  createdAt: z.string(),
});

export class IngestResponseDto extends createZodDto(IngestResponseSchema) { }
