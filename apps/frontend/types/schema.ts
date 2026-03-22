import { z } from 'zod';

// Re-export shared schemas to avoid duplication
export {
    CollectionSchema,
    CreateCollectionSchema,
    ChunkSchema,
    SessionResponseSchema as SessionSchema,
} from '@ragler/shared';

export type {
    Collection,
    CreateCollectionInput as CreateCollectionRequest,
    Chunk,
    SessionResponse as Session,
} from '@ragler/shared';

// Ingest form schema — UI-specific (combines web/manual/file into a single form)
export const IngestSchema = z.object({
    sourceType: z.enum(['manual', 'web', 'file']),
    url: z.string().optional(),
    content: z.string().optional(),
}).refine((data) => {
    if (data.sourceType === 'web' && !data.url) return false;
    if (data.sourceType === 'manual' && !data.content) return false;
    return true;
}, {
    message: "Missing required fields for selected source type",
});
export type IngestRequest = z.infer<typeof IngestSchema>;
