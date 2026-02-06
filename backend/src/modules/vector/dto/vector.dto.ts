import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { SourceTypeSchema, ChunkTypeSchema } from './payload.dto';

// Search filters schema
export const SearchFiltersSchema = z.object({
  source_types: z.array(SourceTypeSchema).optional(),
  chunk_types: z.array(ChunkTypeSchema).optional(),
  exclude_navigation: z.boolean().optional().default(true),
  tags: z.array(z.string()).optional(),
  date_range: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }).optional(),
}).optional();

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

// Search request with filters
export const SearchRequestSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  collectionId: z.string().uuid('Invalid collection ID format'),
  limit: z.number().int().min(1).max(100).optional().default(10),
  filters: SearchFiltersSchema,
});

export class SearchRequestDto extends createZodDto(SearchRequestSchema) {}

// Enhanced search result with structured metadata
export const SearchResultSchema = z.object({
  id: z.string(),
  score: z.number(),
  content: z.string(),

  // Document metadata
  doc: z.object({
    url: z.string(),
    title: z.string().nullable(),
    source_type: z.string(),
    revision: z.union([z.number(), z.string()]),
  }),

  // Chunk metadata
  chunk: z.object({
    type: z.string(),
    heading_path: z.array(z.string()),
    section: z.string().nullable(),
    lang: z.string(),
  }),

  tags: z.array(z.string()),
});

export type SearchResultDto = z.infer<typeof SearchResultSchema>;

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  total: z.number().int().nonnegative(),
  query: z.string(),
});

export type SearchResponseDto = z.infer<typeof SearchResponseSchema>;
