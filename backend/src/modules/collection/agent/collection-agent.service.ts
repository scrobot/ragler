import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

  private openai!: OpenAI;
  private modelName = 'gpt-4o';
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
    this.openai = new OpenAI({ apiKey });

    const configuredModel = this.configService.get<string>('openai.agentModel');
    if (configuredModel) {
      this.modelName = configuredModel;
    }

    this.logger.log({ event: 'agent_client_initialized', model: this.modelName });
  }

  private initializeTools(): void {
    this.tools = [
      createAnalyzeQualityTool(this.chunkService),
      createScoreChunkTool(this.openai),
      createSuggestOperationTool(this.openai),
      createGetChunkTool(this.chunkService),
      createGetChunksContextTool(this.chunkService),
    ];

    this.logger.log({
      event: 'agent_tools_initialized',
      toolCount: this.tools.length,
      toolNames: this.tools.map((t) => t.name),
    });
  }

  private toOpenAITool(tool: AgentTool): OpenAI.Chat.Completions.ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    };
  }

  private getToolMap(tools: AgentTool[]): Map<string, AgentTool> {
    return new Map(tools.map((tool) => [tool.name, tool]));
  }

  private extractTextContent(
    content: unknown,
  ): string {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part: unknown) => {
          if (
            typeof part === 'object' &&
            part !== null &&
            'text' in part &&
            typeof (part as { text: unknown }).text === 'string'
          ) {
            return (part as { text: string }).text;
          }
          return '';
        })
        .join('')
        .trim();
    }

    return '';
  }

  private buildConversation(
    history: Awaited<ReturnType<AgentMemoryService['loadHistory']>>,
    userMessage: string,
    collectionId: string,
    userId: string,
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const contextMessage = `You are helping with collection ID: ${collectionId}. User ID: ${userId}.`;

    const convertedHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = history
      .map((entry) => {
        if (entry.role === 'human') {
          return {
            role: 'user',
            content: entry.content,
          } satisfies OpenAI.Chat.Completions.ChatCompletionUserMessageParam;
        }

        return {
          role: 'assistant',
          content: entry.content,
        } satisfies OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam;
      });

    return [
      {
        role: 'system',
        content: `${COLLECTION_AGENT_SYSTEM_PROMPT}\n\n${contextMessage}`,
      },
      ...convertedHistory,
      {
        role: 'user',
        content: userMessage,
      },
    ];
  }

  /**
   * Stream chat responses with the agent.
   *
   * LangChain/LangGraph has been replaced with direct tool-calling orchestration,
   * matching the same frontend SSE event contract.
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
      const openAITools = sessionTools.map((tool) => this.toOpenAITool(tool));
      const toolMap = this.getToolMap(sessionTools);

      const messages = this.buildConversation(history, message, collectionId, userId);

      yield { type: 'thinking', timestamp: new Date().toISOString() };

      let finalContent = '';

      for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
        const response = await this.openai.chat.completions.create({
          model: this.modelName,
          temperature: 0,
          messages,
          tools: openAITools,
          tool_choice: 'auto',
        });

        const assistantMessage = response.choices[0]?.message;
        if (!assistantMessage) {
          throw new Error('Model returned no message');
        }

        const assistantText = this.extractTextContent(assistantMessage.content);

        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          const functionToolCalls = assistantMessage.tool_calls.filter(
            (
              call,
            ): call is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall =>
              call.type === 'function',
          );

          const assistantWithTools: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
            role: 'assistant',
            content: assistantText || null,
            tool_calls: functionToolCalls.map((call) => ({
              id: call.id,
              type: 'function',
              function: {
                name: call.function.name,
                arguments: call.function.arguments,
              },
            })),
          };
          messages.push(assistantWithTools);

          if (assistantText) {
            finalContent = assistantText;
            yield {
              type: 'message',
              content: assistantText,
              timestamp: new Date().toISOString(),
            };
          }

          for (const toolCall of functionToolCalls) {
            const toolName = toolCall.function.name;
            let rawInput: unknown = {};

            try {
              rawInput = toolCall.function.arguments
                ? JSON.parse(toolCall.function.arguments)
                : {};
            } catch (error) {
              rawInput = {};
              this.logger.warn({
                event: 'agent_tool_args_parse_failed',
                tool: toolName,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }

            yield {
              type: 'tool_call',
              tool: toolName,
              input: rawInput,
              timestamp: new Date().toISOString(),
            };

            const tool = toolMap.get(toolName);
            let toolResult: string;

            if (!tool) {
              toolResult = JSON.stringify({
                success: false,
                error: `Unknown tool: ${toolName}`,
              });
            } else {
              try {
                const parsedInput = tool.parse(rawInput);
                toolResult = await tool.execute(parsedInput);
              } catch (error) {
                toolResult = JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : 'Unknown error',
                  tool: toolName,
                });
              }
            }

            yield {
              type: 'tool_result',
              tool: toolName,
              output: toolResult,
              timestamp: new Date().toISOString(),
            };

            const toolMessage: OpenAI.Chat.Completions.ChatCompletionToolMessageParam = {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: toolResult,
            };
            messages.push(toolMessage);
          }

          continue;
        }

        if (assistantText) {
          finalContent = assistantText;
          yield {
            type: 'message',
            content: assistantText,
            timestamp: new Date().toISOString(),
          };
        } else if (assistantMessage.refusal) {
          finalContent = assistantMessage.refusal;
          yield {
            type: 'message',
            content: assistantMessage.refusal,
            timestamp: new Date().toISOString(),
          };
        }

        break;
      }

      if (!finalContent) {
        finalContent = 'No response generated. Please try again with a more specific request.';
      }

      await this.memoryService.addMessage(sessionId, {
        role: 'human',
        content: message,
      });
      await this.memoryService.addMessage(sessionId, {
        role: 'ai',
        content: finalContent,
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
