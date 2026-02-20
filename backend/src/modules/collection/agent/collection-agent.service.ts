import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import OpenAI from 'openai';

import { ChunkService } from '../chunk.service';
import { AgentMemoryService } from './memory/redis-memory';
import { COLLECTION_AGENT_SYSTEM_PROMPT } from './prompts/system-prompt';
import {
  createAnalyzeQualityTool,
  createScoreChunkTool,
  createSuggestOperationTool,
  createGetChunkTool,
  createGetChunksContextTool,
  createExecuteOperationTool,
} from './tools';
import type { AgentEvent } from '../dto/agent.dto';

interface AgentInvokeInput {
  messages: Array<HumanMessage | AIMessage | SystemMessage>;
}

@Injectable()
export class CollectionAgentService implements OnModuleInit {
  private readonly logger = new Logger(CollectionAgentService.name);
  private tools: DynamicStructuredTool[] = [];
  private openai: OpenAI;
  private model: ChatOpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly chunkService: ChunkService,
    private readonly memoryService: AgentMemoryService,
  ) {}

  onModuleInit(): void {
    this.initializeTools();
    this.initializeModel();
  }

  private initializeTools(): void {
    const apiKey = this.configService.get<string>('openai.apiKey');
    this.openai = new OpenAI({ apiKey });

    // Create tools with required dependencies
    this.tools = [
      createAnalyzeQualityTool(this.chunkService),
      createScoreChunkTool(this.openai),
      createSuggestOperationTool(this.openai),
      createGetChunkTool(this.chunkService),
      createGetChunksContextTool(this.chunkService),
      // execute_operation tool is created per-session with approved ops
    ];

    this.logger.log({
      event: 'agent_tools_initialized',
      toolCount: this.tools.length,
      toolNames: this.tools.map((t) => t.name),
    });
  }

  private initializeModel(): void {
    const apiKey = this.configService.get<string>('openai.apiKey');

    this.model = new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0,
      apiKey,
    });

    this.logger.log({ event: 'agent_model_initialized' });
  }

  /**
   * Stream chat responses with the agent
   */
  async *streamChat(
    collectionId: string,
    userId: string,
    message: string,
    sessionId: string,
  ): AsyncGenerator<AgentEvent> {
    const startTime = Date.now();

    this.logger.log({
      event: 'agent_chat_start',
      collectionId,
      sessionId,
      messageLength: message.length,
    });

    try {
      // Load conversation history and approved operations
      const history = await this.memoryService.loadHistory(sessionId);
      const approvedOps = await this.memoryService.loadApprovedOperations(sessionId);

      // Create tools with session-specific execute_operation
      const sessionTools = [
        ...this.tools,
        createExecuteOperationTool(this.chunkService, () => approvedOps),
      ];

      // Create agent for this session
      const agent = createReactAgent({
        llm: this.model,
        tools: sessionTools,
      });

      // Build message list with context
      const contextMessage = `You are helping with collection ID: ${collectionId}. User ID: ${userId}.`;
      const messages = [
        new SystemMessage(COLLECTION_AGENT_SYSTEM_PROMPT + '\n\n' + contextMessage),
        ...history,
        new HumanMessage(message),
      ];

      yield { type: 'thinking', timestamp: new Date().toISOString() };

      // Stream agent events
      const stream = await agent.stream(
        { messages } as AgentInvokeInput,
        { streamMode: 'values' },
      );

      let lastContent = '';

      for await (const state of stream) {
        const stateMessages = state.messages || [];
        const lastMessage = stateMessages[stateMessages.length - 1];

        if (!lastMessage) continue;

        // Check for tool calls
        if ('tool_calls' in lastMessage && Array.isArray(lastMessage.tool_calls)) {
          for (const toolCall of lastMessage.tool_calls) {
            yield {
              type: 'tool_call',
              tool: toolCall.name,
              input: toolCall.args,
              timestamp: new Date().toISOString(),
            };
          }
        }

        // Check for tool results
        if (lastMessage._getType() === 'tool') {
          yield {
            type: 'tool_result',
            tool: (lastMessage as { name?: string }).name || 'unknown',
            output: lastMessage.content,
            timestamp: new Date().toISOString(),
          };
        }

        // Check for AI message content
        if (lastMessage._getType() === 'ai' && typeof lastMessage.content === 'string') {
          if (lastMessage.content && lastMessage.content !== lastContent) {
            lastContent = lastMessage.content;
            yield {
              type: 'message',
              content: lastMessage.content,
              timestamp: new Date().toISOString(),
            };
          }
        }
      }

      // Save updated history
      await this.memoryService.addMessage(sessionId, new HumanMessage(message));
      if (lastContent) {
        await this.memoryService.addMessage(sessionId, new AIMessage(lastContent));
      }

      yield { type: 'done', timestamp: new Date().toISOString() };

      const duration = Date.now() - startTime;
      this.logger.log({
        event: 'agent_chat_success',
        collectionId,
        sessionId,
        durationMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error({
        event: 'agent_chat_error',
        collectionId,
        sessionId,
        durationMs: duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      yield {
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Approve an operation for execution
   */
  async approveOperation(sessionId: string, operationId: string): Promise<void> {
    await this.memoryService.approveOperation(sessionId, operationId);

    this.logger.log({
      event: 'operation_approved',
      sessionId,
      operationId,
    });
  }

  /**
   * Revoke an operation approval
   */
  async revokeApproval(sessionId: string, operationId: string): Promise<void> {
    await this.memoryService.revokeApproval(sessionId, operationId);

    this.logger.log({
      event: 'operation_revoked',
      sessionId,
      operationId,
    });
  }

  /**
   * Clear conversation history for a session
   */
  async clearSession(sessionId: string): Promise<void> {
    await this.memoryService.clearHistory(sessionId);
    await this.memoryService.clearApprovedOperations(sessionId);

    this.logger.log({
      event: 'session_cleared',
      sessionId,
    });
  }

  /**
   * Non-streaming chat for simple requests
   */
  async chat(
    collectionId: string,
    userId: string,
    message: string,
    sessionId: string,
  ): Promise<{ response: string; toolCalls: Array<{ tool: string; input: unknown; output: unknown }> }> {
    const events: AgentEvent[] = [];
    const toolCalls: Array<{ tool: string; input: unknown; output: unknown }> = [];
    let response = '';

    for await (const event of this.streamChat(collectionId, userId, message, sessionId)) {
      events.push(event);

      if (event.type === 'tool_call') {
        toolCalls.push({ tool: event.tool, input: event.input, output: undefined });
      }

      if (event.type === 'tool_result') {
        const lastToolCall = toolCalls.find((tc) => tc.tool === event.tool && tc.output === undefined);
        if (lastToolCall) {
          lastToolCall.output = event.output;
        }
      }

      if (event.type === 'message') {
        response = event.content;
      }
    }

    return { response, toolCalls };
  }
}
