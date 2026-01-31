import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const SearchRequestSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  collectionId: z.string().uuid('Invalid collection ID format'),
  limit: z.number().int().min(1).max(100).optional().default(10),
});

export class SearchRequestDto extends createZodDto(SearchRequestSchema) {}

export const SearchResultSchema = z.object({
  id: z.string(),
  score: z.number(),
  content: z.string(),
  sourceUrl: z.string(),
  sourceType: z.string(),
});

export type SearchResultDto = z.infer<typeof SearchResultSchema>;

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  total: z.number().int().nonnegative(),
  query: z.string(),
});

export type SearchResponseDto = z.infer<typeof SearchResponseSchema>;
