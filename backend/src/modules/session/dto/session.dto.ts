import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ChunkSchema = z.object({
  id: z.string(),
  text: z.string(),
  isDirty: z.boolean(),
});

export type ChunkDto = z.infer<typeof ChunkSchema>;

export const SessionResponseSchema = z.object({
  sessionId: z.string(),
  sourceUrl: z.string(),
  sourceType: z.enum(['manual', 'confluence', 'web']),
  status: z.string(),
  chunks: z.array(ChunkSchema),
  /**
   * Raw HTML/XML content for source preview.
   * Present for web (HTML) and confluence (storage format XML) sources.
   * null for manual text sources.
   * WARNING: Must be sanitized (e.g., DOMPurify) before rendering in browser.
   */
  rawContent: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class SessionResponseDto extends createZodDto(SessionResponseSchema) {}

export const MergeChunksSchema = z.object({
  chunkIds: z
    .array(z.string())
    .min(2, 'At least 2 chunks are required for merge'),
});

export class MergeChunksDto extends createZodDto(MergeChunksSchema) {}

export const SplitChunkSchema = z
  .object({
    splitPoints: z.array(z.number()).optional(),
    newTextBlocks: z.array(z.string()).optional(),
  })
  .refine(
    (data) => data.splitPoints || data.newTextBlocks,
    {
      message: 'Either splitPoints or newTextBlocks must be provided',
    },
  );

export class SplitChunkDto extends createZodDto(SplitChunkSchema) {}

export const UpdateChunkSchema = z.object({
  text: z.string().min(1, 'Text is required'),
});

export class UpdateChunkDto extends createZodDto(UpdateChunkSchema) {}

export const PublishSchema = z.object({
  targetCollectionId: z.string().uuid('Invalid collection ID format'),
});

export class PublishDto extends createZodDto(PublishSchema) {}

export const PreviewResponseSchema = z.object({
  sessionId: z.string(),
  status: z.string(),
  chunks: z.array(ChunkSchema),
  isValid: z.boolean(),
  warnings: z.array(z.string()),
});

export class PreviewResponseDto extends createZodDto(PreviewResponseSchema) {}

export const PublishResponseSchema = z.object({
  sessionId: z.string(),
  publishedChunks: z.number().int().nonnegative(),
  collectionId: z.string(),
});

export class PublishResponseDto extends createZodDto(PublishResponseSchema) {}

export const SessionListItemSchema = z.object({
  sessionId: z.string(),
  sourceUrl: z.string(),
  sourceType: z.enum(['manual', 'confluence', 'web']),
  status: z.string(),
  chunkCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class SessionListItemDto extends createZodDto(SessionListItemSchema) {}

export const SessionListResponseSchema = z.object({
  sessions: z.array(SessionListItemSchema),
  total: z.number().int().nonnegative(),
});

export class SessionListResponseDto extends createZodDto(SessionListResponseSchema) {}

export const DeleteSessionResponseSchema = z.object({
  sessionId: z.string(),
  deleted: z.boolean(),
});

export class DeleteSessionResponseDto extends createZodDto(DeleteSessionResponseSchema) {}
