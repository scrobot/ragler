import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateCollectionSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
});

export class CreateCollectionDto extends createZodDto(CreateCollectionSchema) {}

export type CreateCollectionInput = z.infer<typeof CreateCollectionSchema>;
