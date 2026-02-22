import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const DocumentSummarySchema = z.object({
    sourceId: z.string().describe('MD5 hash of source identifier'),
    title: z.string().nullable().describe('Document/page title'),
    sourceType: z.enum(['confluence', 'web', 'manual', 'file']),
    sourceUrl: z.string().describe('Original source URL'),
    filename: z.string().nullable().describe('Original filename for file uploads'),
    mimeType: z.string().nullable().describe('MIME type of source'),
    chunkCount: z.number().int().nonnegative(),
    avgQualityScore: z.number().nullable().describe('Average quality score across chunks'),
    ingestDate: z.string().datetime().nullable().describe('ISO-8601 timestamp of ingestion'),
    lastModifiedAt: z.string().datetime().describe('Latest modification timestamp'),
});

export type DocumentSummary = z.infer<typeof DocumentSummarySchema>;

export class DocumentSummaryDto extends createZodDto(DocumentSummarySchema) { }

export const DocumentListResponseSchema = z.object({
    documents: z.array(DocumentSummarySchema),
    total: z.number().int().nonnegative(),
});

export type DocumentListResponse = z.infer<typeof DocumentListResponseSchema>;

export class DocumentListResponseDto extends createZodDto(DocumentListResponseSchema) { }
