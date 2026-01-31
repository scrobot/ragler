import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const SourceTypeEnum = z.enum(['confluence', 'web', 'manual']);
export type SourceType = z.infer<typeof SourceTypeEnum>;

export const IngestRequestSchema = z
  .object({
    sourceType: SourceTypeEnum,
    url: z.string().url('Invalid URL format').optional(),
    content: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.sourceType === 'manual') {
        return !!data.content;
      }
      return !!data.url;
    },
    {
      message: 'URL is required for confluence/web sources, content is required for manual source',
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
