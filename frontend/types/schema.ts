import { z } from 'zod';

export const UserRoleSchema = z.enum(['ML', 'DEV', 'L2']);
export type UserRole = z.infer<typeof UserRoleSchema>;

// Collections
export const CollectionSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().optional(),
    createdBy: z.string(),
    createdAt: z.string(),
});
export type Collection = z.infer<typeof CollectionSchema>;

export const CreateCollectionSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
});
export type CreateCollectionRequest = z.infer<typeof CreateCollectionSchema>;

// Chunks
export const ChunkSchema = z.object({
    id: z.string(),
    text: z.string(),
    isDirty: z.boolean(),
});
export type Chunk = z.infer<typeof ChunkSchema>;

// Sessions
export const SessionSchema = z.object({
    sessionId: z.string(),
    sourceUrl: z.string(),
    status: z.string(),
    chunks: z.array(ChunkSchema),
    createdAt: z.string(),
    updatedAt: z.string(),
});
export type Session = z.infer<typeof SessionSchema>;

// Ingest
export const IngestSchema = z.object({
    sourceType: z.enum(['manual', 'confluence', 'web']),
    url: z.string().optional(),
    pageId: z.string().optional(),
    content: z.string().optional(),
}).refine((data) => {
    if (data.sourceType === 'confluence' && !data.url && !data.pageId) return false;
    if (data.sourceType === 'web' && !data.url) return false;
    if (data.sourceType === 'manual' && !data.content) return false;
    return true;
}, {
    message: "Missing required fields for selected source type",
});
export type IngestRequest = z.infer<typeof IngestSchema>;
