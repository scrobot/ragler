import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const SourceTypeEnum = z.enum(['confluence', 'web', 'manual']);
export type SourceType = z.infer<typeof SourceTypeEnum>;

export const IngestRequestSchema = z
  .object({
    sourceType: SourceTypeEnum,
    url: z.string().url('Invalid URL format').optional(),
    content: z
      .string()
      .min(1, 'Content cannot be empty')
      .max(102400, 'Content exceeds maximum length of 100KB')
      .optional(),
    pageId: z.string().regex(/^\d+$/, 'Page ID must be numeric').optional(),
  })
  .refine(
    (data) => {
      if (data.sourceType === 'manual') {
        return !!data.content;
      }
      if (data.sourceType === 'confluence') {
        // Confluence accepts either url OR pageId
        return !!data.url || !!data.pageId;
      }
      // Web requires url
      return !!data.url;
    },
    {
      message: 'URL is required for web sources, URL or pageId for confluence, content for manual',
    },
  )
  .refine(
    (data) => {
      // pageId is only valid for confluence source type
      if (data.pageId && data.sourceType !== 'confluence') {
        return false;
      }
      return true;
    },
    {
      message: 'pageId is only valid for confluence source type',
    },
  );

export class IngestRequestDto extends createZodDto(IngestRequestSchema) {}

export const IngestResponseSchema = z.object({
  sessionId: z.string(),
  sourceType: SourceTypeEnum,
  sourceUrl: z.string(),
  status: z.string(),
  createdAt: z.string(),
});

export class IngestResponseDto extends createZodDto(IngestResponseSchema) {}
