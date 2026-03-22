import { createZodDto } from 'nestjs-zod';
import {
  CollectionSchema,
  CollectionListSchema,
  type Collection,
  type CollectionList,
} from '@ragler/shared';

export {
  CollectionSchema,
  CollectionListSchema,
  type Collection,
  type CollectionList,
};
export class CollectionResponseDto extends createZodDto(CollectionSchema) {}
export class CollectionListResponseDto extends createZodDto(CollectionListSchema) {}
