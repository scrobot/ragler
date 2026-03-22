import { createZodDto } from 'nestjs-zod';
import { IngestManualSchema } from '@ragler/shared';

export { IngestManualSchema };
export class IngestManualDto extends createZodDto(IngestManualSchema) {}
