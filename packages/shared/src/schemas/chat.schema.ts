import { z } from 'zod';

export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(5000),
  sessionId: z.string().optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatCitationSchema = z.object({
  chunkId: z.string(),
  content: z.string(),
  score: z.number(),
});

export type ChatCitation = z.infer<typeof ChatCitationSchema>;

export const ChatResponseSchema = z.object({
  answer: z.string(),
  sessionId: z.string(),
  citations: z.array(ChatCitationSchema),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;
