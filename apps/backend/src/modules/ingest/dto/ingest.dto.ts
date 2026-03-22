import { createZodDto } from 'nestjs-zod';
import {
  SourceTypeEnum,
  IngestResponseSchema,
  type SourceType,
  type IngestResponse,
} from '@ragler/shared';

export { SourceTypeEnum, type SourceType, type IngestResponse };
export * from './ingest-web.dto';
export * from './ingest-manual.dto';

export class IngestResponseDto extends createZodDto(IngestResponseSchema) {}
