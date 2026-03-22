import { z } from 'zod';

// --- Create ---
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

export type CreateCollectionInput = z.infer<typeof CreateCollectionSchema>;

// --- Read ---
export const CollectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export type Collection = z.infer<typeof CollectionSchema>;

export const CollectionListSchema = z.object({
  collections: z.array(CollectionSchema),
  total: z.number().int().nonnegative(),
});

export type CollectionList = z.infer<typeof CollectionListSchema>;
