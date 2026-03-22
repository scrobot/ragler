import { createZodDto } from 'nestjs-zod';
import { IngestWebSchema } from '@ragler/shared';

export { IngestWebSchema };
export class IngestWebDto extends createZodDto(IngestWebSchema) {}
