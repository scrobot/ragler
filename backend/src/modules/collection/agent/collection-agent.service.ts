import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ToolLoopAgent,
  stepCountIs,
  tool,
  type ModelMessage,
  type ToolSet,
} from 'ai';
import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai';
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
  type AgentTool,
} from './tools';
import type { AgentEvent } from '../dto/agent.dto';

const MAX_TOOL_ITERATIONS = 8;

@Injectable()
export class CollectionAgentService implements OnModuleInit {
  private readonly logger = new Logger(CollectionAgentService.name);

  private openaiProvider!: OpenAIProvider;
  private modelId = 'gpt-4o';
  private tools: AgentTool[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly chunkService: ChunkService,
    private readonly memoryService: AgentMemoryService,
  ) {}

  onModuleInit(): void {
    this.initializeClient();
    this.initializeTools();
  }

  private initializeClient(): void {
    const apiKey = this.configService.get<string>('openai.apiKey');
    this.openaiProvider = createOpenAI({ apiKey });

    const configuredModel = this.configService.get<string>('openai.agentModel');
    if (configuredModel) {
      this.modelId = configuredModel;
    }

    this.logger.log({ event: 'agent_client_initialized', model: this.modelId });
  }

  private initializeTools(): void {
    const apiKey = this.configService.get<string>('openai.apiKey');
    const openaiClient = new OpenAI({ apiKey });

    this.tools = [
      createAnalyzeQualityTool(this.chunkService),
      createScoreChunkTool(openaiClient),
      createSuggestOperationTool(openaiClient),
      createGetChunkTool(this.chunkService),
      createGetChunksContextTool(this.chunkService),
    ];

    this.logger.log({
      event: 'agent_tools_initialized',
      toolCount: this.tools.length,
      toolNames: this.tools.map((t) => t.name),
    });
  }

  private buildMessages(
    history: Awaited<ReturnType<AgentMemoryService['loadHistory']>>,
    userMessage: string,
  ): ModelMessage[] {
    const historyMessages: ModelMessage[] = history.map((entry) => {
      if (entry.role === 'human') {
        return {
          role: 'user',
          content: entry.content,
        };
      }

      return {
        role: 'assistant',
        content: entry.content,
      };
    });

    return [
      ...historyMessages,
      {
        role: 'user',
        content: userMessage,
      },
    ];
  }

  private toToolSet(tools: AgentTool[]): ToolSet {
    const toolSet: ToolSet = {};

    for (const agentTool of tools) {
      toolSet[agentTool.name] = tool({
        description: agentTool.description,
        // Keep input schema broad to avoid deep generic instantiation.
        inputSchema: agentTool.schema as any,
        execute: async (input: unknown): Promise<string> => {
          const parsed = agentTool.parse(input);
          return agentTool.execute(parsed);
        },
      }) as ToolSet[string];
    }

    return toolSet;
  }

  private createAgent(
    collectionId: string,
    userId: string,
    tools: AgentTool[],
  ): ToolLoopAgent<never, ToolSet> {
    const contextMessage = `You are helping with collection ID: ${collectionId}. User ID: ${userId}.`;

    return new ToolLoopAgent({
      model: this.openaiProvider(this.modelId),
      instructions: `${COLLECTION_AGENT_SYSTEM_PROMPT}\n\n${contextMessage}`,
      tools: this.toToolSet(tools),
      temperature: 0,
      stopWhen: stepCountIs(MAX_TOOL_ITERATIONS),
    });
  }

  /**
   * Stream chat responses with Vercel AI SDK ToolLoopAgent.
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
      const history = await this.memoryService.loadHistory(sessionId);
      const approvedOps = await this.memoryService.loadApprovedOperations(sessionId);

      const sessionTools: AgentTool[] = [
        ...this.tools,
        createExecuteOperationTool(this.chunkService, () => approvedOps),
      ];

      const agent = this.createAgent(collectionId, userId, sessionTools);
      const messages = this.buildMessages(history, message);

      const bufferedEvents: AgentEvent[] = [];
      let latestAssistantText = '';

      yield { type: 'thinking', timestamp: new Date().toISOString() };

      const result = await agent.generate({
        messages,
        onStepFinish: (step) => {
          const ts = new Date().toISOString();

          for (const toolCall of step.toolCalls) {
            bufferedEvents.push({
              type: 'tool_call',
              tool: toolCall.toolName,
              input: toolCall.input,
              timestamp: ts,
            });
          }

          for (const toolResult of step.toolResults) {
            bufferedEvents.push({
              type: 'tool_result',
              tool: toolResult.toolName,
              output: toolResult.output,
              timestamp: ts,
            });
          }

          if (step.text && step.text.trim() && step.text !== latestAssistantText) {
            latestAssistantText = step.text;
            bufferedEvents.push({
              type: 'message',
              content: step.text,
              timestamp: ts,
            });
          }
        },
      });

      if (result.text && result.text.trim() && result.text !== latestAssistantText) {
        latestAssistantText = result.text;
        bufferedEvents.push({
          type: 'message',
          content: result.text,
          timestamp: new Date().toISOString(),
        });
      }

      for (const event of bufferedEvents) {
        yield event;
      }

      const persistedAssistantText =
        latestAssistantText ||
        'No response generated. Please try again with a more specific request.';

      await this.memoryService.addMessage(sessionId, {
        role: 'human',
        content: message,
      });
      await this.memoryService.addMessage(sessionId, {
        role: 'ai',
        content: persistedAssistantText,
      });

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
    const toolCalls: Array<{ tool: string; input: unknown; output: unknown }> = [];
    let response = '';

    for await (const event of this.streamChat(collectionId, userId, message, sessionId)) {
      if (event.type === 'tool_call') {
        toolCalls.push({ tool: event.tool, input: event.input, output: undefined });
      }

      if (event.type === 'tool_result') {
        const lastToolCall = toolCalls.find(
          (tc) => tc.tool === event.tool && tc.output === undefined,
        );
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
