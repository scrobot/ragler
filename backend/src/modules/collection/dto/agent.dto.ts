import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Agent Chat Request DTO
 */
export const AgentChatSchema = z.object({
  message: z.string().min(1).max(4000).describe('User message to the agent'),
  sessionId: z.string().uuid().describe('Conversation session ID'),
});

export class AgentChatDto extends createZodDto(AgentChatSchema) {}

/**
 * Approve Operation Request DTO
 */
export const ApproveOperationSchema = z.object({
  sessionId: z.string().uuid().describe('Conversation session ID'),
  operationId: z.string().uuid().describe('Operation ID to approve'),
});

export class ApproveOperationDto extends createZodDto(ApproveOperationSchema) {}

/**
 * Agent Event Types for SSE streaming
 */
export type AgentEventType =
  | 'thinking'
  | 'tool_call'
  | 'tool_result'
  | 'message'
  | 'error'
  | 'done';

export interface AgentThinkingEvent {
  type: 'thinking';
  timestamp: string;
}

export interface AgentToolCallEvent {
  type: 'tool_call';
  tool: string;
  input: unknown;
  timestamp: string;
}

export interface AgentToolResultEvent {
  type: 'tool_result';
  tool: string;
  output: unknown;
  timestamp: string;
}

export interface AgentMessageEvent {
  type: 'message';
  content: string;
  timestamp: string;
}

export interface AgentErrorEvent {
  type: 'error';
  message: string;
  timestamp: string;
}

export interface AgentDoneEvent {
  type: 'done';
  timestamp: string;
}

export type AgentEvent =
  | AgentThinkingEvent
  | AgentToolCallEvent
  | AgentToolResultEvent
  | AgentMessageEvent
  | AgentErrorEvent
  | AgentDoneEvent;

/**
 * Conversation Message stored in Redis
 */
export interface StoredMessage {
  role: 'human' | 'ai';
  content: string;
  timestamp: string;
}

/**
 * Agent Chat Response (for non-streaming endpoint)
 */
export const AgentChatResponseSchema = z.object({
  sessionId: z.string().uuid(),
  response: z.string(),
  toolCalls: z.array(
    z.object({
      tool: z.string(),
      input: z.unknown(),
      output: z.unknown(),
    }),
  ),
});

export type AgentChatResponse = z.infer<typeof AgentChatResponseSchema>;
