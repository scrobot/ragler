import { createZodDto } from 'nestjs-zod';
import {
  ChatRequestSchema,
  ChatCitationSchema,
  ChatResponseSchema,
  type ChatRequest,
  type ChatCitation,
  type ChatResponse,
} from '@ragler/shared';

export {
  ChatRequestSchema,
  ChatCitationSchema,
  type ChatRequest,
  type ChatCitation,
  type ChatResponse,
};

export class ChatRequestDto extends createZodDto(ChatRequestSchema) {}
export class ChatResponseDto extends createZodDto(ChatResponseSchema) {}
