import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CollectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export class CollectionResponseDto extends createZodDto(CollectionSchema) {}

export const CollectionListSchema = z.object({
  collections: z.array(CollectionSchema),
  total: z.number().int().nonnegative(),
});

export class CollectionListResponseDto extends createZodDto(CollectionListSchema) {}
