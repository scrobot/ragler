import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  ChunkTypeSchema,
  LanguageSchema,
  EditorMetadataSchema,
} from '@modules/vector/dto/payload.dto';

// ============================================================================
// Query DTOs
// ============================================================================

export const ListChunksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['position', 'created_at', 'quality_score']).default('position'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().max(200).optional(),
  sourceType: z.enum(['confluence', 'web', 'manual', 'file']).optional(),
  sourceId: z.string().max(200).optional(),
  minQuality: z.coerce.number().min(0).max(100).optional(),
  maxQuality: z.coerce.number().min(0).max(100).optional(),
  tags: z.string().max(500).optional(), // comma-separated tag list
});

export class ListChunksQueryDto extends createZodDto(ListChunksQuerySchema) { }
export type ListChunksQuery = z.infer<typeof ListChunksQuerySchema>;

// ============================================================================
// Response DTOs (prefixed with Editor to avoid conflicts with Session module)
// ============================================================================

export const EditorChunkDocMetadataSchema = z.object({
  url: z.string(),
  title: z.string().nullable(),
  source_type: z.string(),
  revision: z.union([z.number(), z.string()]),
});

export const EditorChunkMetadataSchema = z.object({
  type: ChunkTypeSchema,
  heading_path: z.array(z.string()),
  section: z.string().nullable(),
  lang: LanguageSchema,
});

export const EditorChunkResponseSchema = z.object({
  id: z.string(),
  content: z.string(),
  doc: EditorChunkDocMetadataSchema,
  chunk: EditorChunkMetadataSchema,
  tags: z.array(z.string()),
  editor: EditorMetadataSchema.optional(),
});

export class EditorChunkResponseDto extends createZodDto(EditorChunkResponseSchema) { }
export type EditorChunkResponse = z.infer<typeof EditorChunkResponseSchema>;

export const EditorChunkListResponseSchema = z.object({
  chunks: z.array(EditorChunkResponseSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

export class EditorChunkListResponseDto extends createZodDto(EditorChunkListResponseSchema) { }
export type EditorChunkListResponse = z.infer<typeof EditorChunkListResponseSchema>;

// ============================================================================
// Create/Update DTOs
// ============================================================================

export const EditorCreateChunkSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
  chunkType: ChunkTypeSchema.default('knowledge'),
  headingPath: z.array(z.string()).default([]),
  tags: z.array(z.string().min(1).max(50)).max(12).default([]),
  position: z.number().int().nonnegative().optional(),
});

export class EditorCreateChunkDto extends createZodDto(EditorCreateChunkSchema) { }
export type EditorCreateChunkInput = z.infer<typeof EditorCreateChunkSchema>;

export const EditorUpdateChunkSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  tags: z.array(z.string().min(1).max(50)).max(12).optional(),
  headingPath: z.array(z.string()).optional(),
  chunkType: ChunkTypeSchema.optional(),
});

export class EditorUpdateChunkDto extends createZodDto(EditorUpdateChunkSchema) { }
export type EditorUpdateChunkInput = z.infer<typeof EditorUpdateChunkSchema>;

// ============================================================================
// Split/Merge DTOs
// ============================================================================

export const EditorSplitChunkSchema = z.object({
  // Option 1: Split at character positions
  splitPoints: z.array(z.number().int().positive()).optional(),
  // Option 2: Provide explicit text blocks (LLM-assisted split)
  newTextBlocks: z.array(z.string().min(1)).min(2).optional(),
}).refine(
  (data) => data.splitPoints || data.newTextBlocks,
  { message: 'Either splitPoints or newTextBlocks must be provided' },
);

export class EditorSplitChunkDto extends createZodDto(EditorSplitChunkSchema) { }
export type EditorSplitChunkInput = z.infer<typeof EditorSplitChunkSchema>;

export const EditorMergeChunksSchema = z.object({
  chunkIds: z.array(z.string()).min(2, 'At least 2 chunks required for merge'),
  separator: z.string().max(100).default('\n\n'),
});

export class EditorMergeChunksDto extends createZodDto(EditorMergeChunksSchema) { }
export type EditorMergeChunksInput = z.infer<typeof EditorMergeChunksSchema>;

// ============================================================================
// Reorder DTOs
// ============================================================================

export const ChunkPositionSchema = z.object({
  chunkId: z.string(),
  position: z.number().int().nonnegative(),
});

export const ReorderChunksSchema = z.object({
  chunkPositions: z.array(ChunkPositionSchema).min(1),
});

export class ReorderChunksDto extends createZodDto(ReorderChunksSchema) { }
export type ReorderChunksInput = z.infer<typeof ReorderChunksSchema>;

// ============================================================================
// Quality Score DTOs
// ============================================================================

export const UpdateQualityScoreSchema = z.object({
  score: z.number().min(0).max(100),
  issues: z.array(z.string()).default([]),
});

export class UpdateQualityScoreDto extends createZodDto(UpdateQualityScoreSchema) { }
export type UpdateQualityScoreInput = z.infer<typeof UpdateQualityScoreSchema>;

export const BulkQualityScoreSchema = z.object({
  scores: z.array(
    z.object({
      chunkId: z.string(),
      score: z.number().min(0).max(100),
      issues: z.array(z.string()).default([]),
    }),
  ).min(1),
});

export class BulkQualityScoreDto extends createZodDto(BulkQualityScoreSchema) { }
export type BulkQualityScoreInput = z.infer<typeof BulkQualityScoreSchema>;
