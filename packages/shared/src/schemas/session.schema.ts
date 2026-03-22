import { z } from 'zod';

// --- Core chunk ---
export const ChunkSchema = z.object({
  id: z.string(),
  text: z.string(),
  isDirty: z.boolean(),
});

export type Chunk = z.infer<typeof ChunkSchema>;

// --- Session response ---
export const SessionResponseSchema = z.object({
  sessionId: z.string(),
  sourceUrl: z.string(),
  sourceType: z.enum(['manual', 'web', 'file']),
  status: z.string(),
  chunks: z.array(ChunkSchema),
  /**
   * Raw HTML/XML content for source preview.
   * Present for web (HTML) sources.
   * null for manual text and file sources.
   * WARNING: Must be sanitized (e.g., DOMPurify) before rendering in browser.
   */
  rawContent: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;

// --- Session list ---
export const SessionListItemSchema = z.object({
  sessionId: z.string(),
  sourceUrl: z.string(),
  sourceType: z.enum(['manual', 'web', 'file']),
  status: z.string(),
  chunkCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SessionListItem = z.infer<typeof SessionListItemSchema>;

export const SessionListResponseSchema = z.object({
  sessions: z.array(SessionListItemSchema),
  total: z.number().int().nonnegative(),
});

export type SessionListResponse = z.infer<typeof SessionListResponseSchema>;

// --- Chunk mutations ---
export const MergeChunksSchema = z.object({
  chunkIds: z
    .array(z.string())
    .min(2, 'At least 2 chunks are required for merge'),
});

export type MergeChunksInput = z.infer<typeof MergeChunksSchema>;

export const SplitChunkSchema = z
  .object({
    splitPoints: z.array(z.number()).optional(),
    newTextBlocks: z.array(z.string()).optional(),
  })
  .refine(
    (data) => data.splitPoints || data.newTextBlocks,
    { message: 'Either splitPoints or newTextBlocks must be provided' },
  );

export type SplitChunkInput = z.infer<typeof SplitChunkSchema>;

export const UpdateChunkSchema = z.object({
  text: z.string().min(1, 'Text is required'),
});

export type UpdateChunkInput = z.infer<typeof UpdateChunkSchema>;

// --- Publish ---
export const PublishSchema = z.object({
  targetCollectionId: z.string().uuid('Invalid collection ID format'),
});

export type PublishInput = z.infer<typeof PublishSchema>;

export const PreviewResponseSchema = z.object({
  sessionId: z.string(),
  status: z.string(),
  chunks: z.array(ChunkSchema),
  isValid: z.boolean(),
  warnings: z.array(z.string()),
});

export type PreviewResponse = z.infer<typeof PreviewResponseSchema>;

export const PublishResponseSchema = z.object({
  sessionId: z.string(),
  publishedChunks: z.number().int().nonnegative(),
  collectionId: z.string(),
});

export type PublishResponse = z.infer<typeof PublishResponseSchema>;

export const DeleteSessionResponseSchema = z.object({
  sessionId: z.string(),
  deleted: z.boolean(),
});

export type DeleteSessionResponse = z.infer<typeof DeleteSessionResponseSchema>;
