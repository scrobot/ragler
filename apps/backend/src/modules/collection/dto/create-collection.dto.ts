import { createZodDto } from 'nestjs-zod';
import {
  CreateCollectionSchema,
  type CreateCollectionInput,
} from '@ragler/shared';

export { CreateCollectionSchema, type CreateCollectionInput };
export class CreateCollectionDto extends createZodDto(CreateCollectionSchema) {}
