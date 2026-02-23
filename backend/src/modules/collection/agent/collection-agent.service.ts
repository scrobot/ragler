import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  ToolLoopAgent,
  stepCountIs,
  tool,
  type ModelMessage,
  type ToolSet,
} from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import OpenAI from 'openai';

import { QdrantClientService } from '@infrastructure/qdrant';
import { LlmService } from '@llm/llm.service';
import { SettingsService } from '@modules/settings/settings.service';
import { AgentMemoryService } from './memory/redis-memory';
import { PromptService } from './prompts/prompt.service';
import {
  createScoreChunkTool,
  createListCollectionsTool,
  createScrollChunksTool,
  createSearchChunksTool,
  createGetChunkDirectTool,
  createCountChunksTool,
  createUpdateChunkPayloadTool,
  createDeleteChunksTool,
  createUpsertChunkTool,
  createScanNextDirtyChunkTool,

  type AgentTool,
} from './tools';
import type { AgentEvent } from '../dto/agent.dto';

const MAX_TOOL_ITERATIONS = 30;

@Injectable()
export class CollectionAgentService implements OnModuleInit {
  private readonly logger = new Logger(CollectionAgentService.name);

  private tools: AgentTool[] = [];

  constructor(
    private readonly settingsService: SettingsService,
    private readonly qdrantClient: QdrantClientService,
    private readonly llmService: LlmService,
    private readonly memoryService: AgentMemoryService,
    private readonly promptService: PromptService,
  ) { }

  onModuleInit(): void {
    this.initializeTools();
  }

  private async initializeTools(): Promise<void> {
    const apiKey = await this.settingsService.getEffectiveApiKey();
    const openaiClient = new OpenAI({ apiKey });

    this.tools = [
      // Direct Qdrant tools
      createListCollectionsTool(this.qdrantClient),
      createScrollChunksTool(this.qdrantClient),
      createSearchChunksTool(this.qdrantClient, this.llmService),
      createGetChunkDirectTool(this.qdrantClient),
      createCountChunksTool(this.qdrantClient),
      createUpdateChunkPayloadTool(this.qdrantClient),
      createDeleteChunksTool(this.qdrantClient),
      createUpsertChunkTool(this.qdrantClient, this.llmService),
      createScanNextDirtyChunkTool(this.qdrantClient),

      // LLM-based scoring
      createScoreChunkTool(openaiClient),
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
        inputSchema: agentTool.schema as any,
        execute: async (input: unknown): Promise<string> => {
          const parsed = agentTool.parse(input);
          return agentTool.execute(parsed);
        },
      }) as ToolSet[string];
    }

    return toolSet;
  }

  private async createAgent(
    collectionId: string,
    userId: string,
  ): Promise<ToolLoopAgent<never, ToolSet>> {
    const [apiKey, modelId] = await Promise.all([
      this.settingsService.getEffectiveApiKey(),
      this.settingsService.getEffectiveModel(),
    ]);
    const openaiProvider = createOpenAI({ apiKey });

    // Re-initialize tools with current API key
    await this.initializeTools();

    const contextMessage = `You are helping with collection ID: ${collectionId}. User ID: ${userId}.`;
    const systemPrompt = await this.promptService.getEffectivePrompt(collectionId);

    return new ToolLoopAgent({
      model: openaiProvider(modelId),
      instructions: `${systemPrompt}\n\n${contextMessage}`,
      tools: this.toToolSet(this.tools),
      temperature: 0,
      stopWhen: stepCountIs(MAX_TOOL_ITERATIONS),
    });
  }

  /**
   * Stream chat responses with Vercel AI SDK ToolLoopAgent.
   * Uses an async queue so events are yielded in real-time as each step finishes.
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
      // Auto-create session if it doesn't exist yet
      const existingSession = await this.memoryService.getSession(sessionId);
      if (!existingSession) {
        await this.memoryService.createSession(userId, collectionId, undefined, sessionId);
        this.logger.log({ event: 'agent_session_auto_created', sessionId, collectionId });
      }

      const history = await this.memoryService.loadHistory(sessionId);

      const agent = await this.createAgent(collectionId, userId);
      const messages = this.buildMessages(history, message);

      // Async queue: events pushed from onStepFinish, consumed by the generator
      const queue: AgentEvent[] = [];
      let isGenerationDone = false;
      let resolveWaiter: (() => void) | null = null;

      const enqueue = (event: AgentEvent): void => {
        queue.push(event);
        resolveWaiter?.();
        resolveWaiter = null;
      };

      let latestAssistantText = '';

      yield { type: 'thinking', timestamp: new Date().toISOString() };

      // Start generation in the background — events flow via enqueue()
      const generationPromise = agent
        .generate({
          messages,
          onStepFinish: (step) => {
            const ts = new Date().toISOString();

            for (const toolCall of step.toolCalls) {
              this.logger.log({
                event: 'agent_tool_call',
                tool: toolCall.toolName,
                input: JSON.stringify(toolCall.input).substring(0, 200),
              });
              enqueue({
                type: 'tool_call',
                tool: toolCall.toolName,
                input: toolCall.input,
                timestamp: ts,
              });
            }

            for (const toolResult of step.toolResults) {
              const output = typeof toolResult.output === 'string'
                ? toolResult.output.substring(0, 300)
                : JSON.stringify(toolResult.output).substring(0, 300);
              this.logger.log({
                event: 'agent_tool_result',
                tool: toolResult.toolName,
                outputPreview: output,
              });
              enqueue({
                type: 'tool_result',
                tool: toolResult.toolName,
                output: toolResult.output,
                timestamp: ts,
              });
            }

            if (step.text && step.text.trim() && step.text !== latestAssistantText) {
              this.logger.log({
                event: 'agent_step_text',
                textPreview: step.text.substring(0, 200),
              });
              latestAssistantText = step.text;
              enqueue({
                type: 'message',
                content: step.text,
                timestamp: ts,
              });
            }
          },
        })
        .then((result) => {
          if (result.text && result.text.trim() && result.text !== latestAssistantText) {
            latestAssistantText = result.text;
            enqueue({
              type: 'message',
              content: result.text,
              timestamp: new Date().toISOString(),
            });
          }
          isGenerationDone = true;
          resolveWaiter?.();
          resolveWaiter = null;
          return result;
        });

      // Consume events from the queue as they arrive
      while (true) {
        if (queue.length > 0) {
          yield queue.shift()!;
          continue;
        }
        if (isGenerationDone) break;

        await new Promise<void>((resolve) => {
          resolveWaiter = resolve;
        });
      }

      // Drain any remaining events
      while (queue.length > 0) {
        yield queue.shift()!;
      }

      // Await to propagate errors
      await generationPromise;

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
   * Synchronous chat — runs agent and returns final response.
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
        const tc = toolCalls.find((t) => t.tool === event.tool && t.output === undefined);
        if (tc) tc.output = event.output;
      }
      if (event.type === 'message') {
        response = event.content;
      }
    }

    return { response, toolCalls };
  }

  /**
   * Approve an operation for execution.
   */
  async approveOperation(sessionId: string, operationId: string): Promise<void> {
    await this.memoryService.approveOperation(sessionId, operationId);
  }

  /**
   * Revoke an operation approval.
   */
  async revokeApproval(sessionId: string, operationId: string): Promise<void> {
    await this.memoryService.revokeApproval(sessionId, operationId);
  }

  /**
   * Clear session data.
   */
  async clearSession(sessionId: string): Promise<void> {
    await Promise.all([
      this.memoryService.clearHistory(sessionId),
      this.memoryService.clearApprovedOperations(sessionId),
    ]);
  }

  /**
   * Generate a knowledge chunk using web search.
   * Uses OpenAI with web_search_preview to get web-grounded content.
   */
  async generateChunkContent(prompt: string): Promise<string> {
    this.logger.log({ event: 'chunk_generation_start', promptLength: prompt.length });
    const startTime = Date.now();

    try {
      const [apiKey, modelId] = await Promise.all([
        this.settingsService.getEffectiveApiKey(),
        this.settingsService.getEffectiveModel(),
      ]);
      const openaiClient = new OpenAI({ apiKey });

      const response = await openaiClient.responses.create({
        model: modelId,
        tools: [{ type: 'web_search_preview' }],
        input: [
          {
            role: 'system',
            content: `You are a knowledge base content writer. The user will give you a topic or question.
Search the web for accurate, up-to-date information and write a concise, factual knowledge chunk.

Rules:
- Write in the SAME LANGUAGE as the user's prompt
- Be factual and cite sources when possible
- Write 150-500 words — enough context for a RAG knowledge base
- Use clear structure: brief intro, key facts, conclusion
- Do NOT add meta-commentary like "Here is the chunk" — just write the content directly
- Do NOT use markdown headers — write plain flowing text with line breaks`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract text from response output items
      const textContent = response.output
        .filter((item) => item.type === 'message')
        .flatMap((item) => 'content' in item ? (item as { content: Array<{ type: string; text?: string }> }).content : [])
        .filter((block) => block.type === 'output_text' && typeof block.text === 'string')
        .map((block) => block.text as string)
        .join('\n\n');

      const duration = Date.now() - startTime;
      this.logger.log({ event: 'chunk_generation_success', durationMs: duration, resultLength: textContent.length });

      if (!textContent.trim()) {
        throw new Error('Web search returned empty content');
      }

      return textContent.trim();
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error({
        event: 'chunk_generation_failure',
        durationMs: duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ============================================================================
  // Collection Cleaning (processor-driven, no LLM)
  // ============================================================================

  async *streamCleanCollection(
    collectionId: string,
  ): AsyncGenerator<AgentEvent> {
    const startTime = Date.now();
    const collectionName = `kb_${collectionId}`;
    const qdrant = this.qdrantClient.getClient();

    this.logger.log({ event: 'clean_collection_start', collectionId });

    const HTML_TAG_REPLACE = /<[^>]*>/g;
    const HTML_TAG_TEST = /<[^>]*>/;
    const MIN_MEANINGFUL = 20;
    const MIN_CHUNK_LEN = 50;
    const SCROLL_PAGE = 50;

    // Base64: long runs of alphanumeric+/= with no spaces (e.g. JPEG/PNG data)
    const BASE64_PATTERN = /[A-Za-z0-9+/=]{100,}/;
    // JSON blob: lots of {"key": patterns
    const JSON_BLOB_PATTERN = /"\w+":\s*(?:true|false|null|"|\d|\[|\{)/g;

    const classifyChunk = (text: string | undefined | null): string | null => {
      if (text === undefined || text === null) return 'empty_payload';
      const trimmed = text.trim();
      if (trimmed.length === 0) return 'whitespace_only';
      const stripped = trimmed.replace(HTML_TAG_REPLACE, ' ').replace(/\s+/g, ' ').trim();
      if (HTML_TAG_TEST.test(trimmed) && stripped.length < MIN_MEANINGFUL) return 'html_only';
      if (stripped.length < MIN_CHUNK_LEN) return 'too_short';

      // Detect base64-encoded binary data (images, fonts, etc.)
      if (BASE64_PATTERN.test(trimmed)) return 'base64_blob';

      // Detect raw JSON data dumps (API responses, serialized objects)
      const jsonMatches = trimmed.match(JSON_BLOB_PATTERN);
      if (jsonMatches && jsonMatches.length >= 5) {
        // If >30% of content is JSON key-value pairs, it's a data dump
        const jsonCharCount = jsonMatches.reduce((sum, m) => sum + m.length, 0);
        if (jsonCharCount / trimmed.length > 0.15) return 'json_blob';
      }

      return null;
    };

    const ts = (): string => new Date().toISOString();

    // Get total count upfront for progress reporting
    const totalCount = await this.qdrantClient.countPoints(collectionName);

    yield { type: 'thinking', timestamp: ts() };

    let totalScanned = 0;
    let totalDeleted = 0;
    const breakdown: Record<string, number> = {};
    let cursor: string | number | Record<string, unknown> | null | undefined = undefined;

    try {
      while (true) {
        // Use raw Qdrant scroll with cursor-based pagination
        const result = await qdrant.scroll(collectionName, {
          limit: SCROLL_PAGE,
          offset: cursor as any,
          with_payload: true,
          with_vector: false,
        });

        const points = result.points as Array<{
          id: string | number;
          payload?: Record<string, unknown>;
        }>;

        if (points.length === 0) break;

        for (const point of points) {
          totalScanned++;
          const chunkPayload = point.payload?.chunk as Record<string, unknown> | undefined;
          const text = chunkPayload?.text as string | undefined;
          const reason = classifyChunk(text);

          if (reason) {
            const chunkId = String(point.id);
            const preview = (text ?? '(no text)').substring(0, 100);

            yield {
              type: 'dirty_chunk_found' as const,
              chunkId,
              reason,
              preview,
              timestamp: ts(),
            };

            await this.qdrantClient.deletePoints(collectionName, [chunkId]);
            totalDeleted++;
            breakdown[reason] = (breakdown[reason] ?? 0) + 1;

            yield {
              type: 'dirty_chunk_deleted' as const,
              chunkId,
              timestamp: ts(),
            };
          }
        }

        // Emit progress every page
        yield {
          type: 'clean_progress' as const,
          scanned: totalScanned,
          total: totalCount,
          timestamp: ts(),
        };

        // Cursor-based pagination: use next_page_offset from Qdrant
        cursor = result.next_page_offset;
        if (cursor === null || cursor === undefined) break;
      }

      // =====================================================================
      // Pass 2: LLM-assisted HTML cleaning (extract text from HTML-rich chunks)
      // =====================================================================

      yield {
        type: 'message' as const,
        content: 'Pass 1 done. Starting HTML cleaning with LLM...',
        timestamp: ts(),
      };

      const isHtmlRich = (text: string): boolean => {
        const tagCount = (text.match(HTML_TAG_TEST) || []).length;
        if (tagCount === 0) return false;
        const stripped = text.replace(HTML_TAG_REPLACE, '').replace(/\s+/g, ' ').trim();
        if (stripped.length < MIN_CHUNK_LEN) return false;
        // Check if HTML tags make up >20% of the content
        const htmlLen = text.length - stripped.length;
        return htmlLen / text.length > 0.2;
      };

      let totalCleaned = 0;
      cursor = undefined;
      const openai = new (await import('openai')).default({
        apiKey: await this.settingsService.getEffectiveApiKey(),
      });
      const modelId = await this.settingsService.getEffectiveModel();

      while (true) {
        const result = await qdrant.scroll(collectionName, {
          limit: SCROLL_PAGE,
          offset: cursor as any,
          with_payload: true,
          with_vector: false,
        });

        const points = result.points as Array<{
          id: string | number;
          payload?: Record<string, unknown>;
        }>;

        if (points.length === 0) break;

        for (const point of points) {
          const chunkPayload = point.payload?.chunk as Record<string, unknown> | undefined;
          const text = chunkPayload?.text as string | undefined;

          if (text && isHtmlRich(text)) {
            const chunkId = String(point.id);

            try {
              const completion = await openai.chat.completions.create({
                model: modelId,
                messages: [
                  {
                    role: 'system',
                    content: `Extract clean plain text from HTML content.
Remove ALL HTML tags, Vue.js comments (<!--[-->, <!---->), class attributes, and markup artifacts.
Convert <li> items to bullet points (• item).
Convert <h1>-<h6> headings to uppercase or bold markers.
Keep ALL original text content — do NOT summarize, rewrite, or translate.
Return ONLY the cleaned text, nothing else.`,
                  },
                  { role: 'user', content: text },
                ],
                temperature: 0,
                max_tokens: 2000,
              });

              const cleanedText = completion.choices[0]?.message?.content?.trim();

              if (cleanedText && cleanedText.length >= MIN_CHUNK_LEN) {
                // Update chunk text in Qdrant payload
                await this.qdrantClient.updatePayloads(collectionName, [{
                  id: chunkId,
                  payload: {
                    chunk: { ...chunkPayload, text: cleanedText },
                  },
                }]);

                totalCleaned++;

                yield {
                  type: 'chunk_cleaned' as const,
                  chunkId,
                  preview: cleanedText.substring(0, 120),
                  timestamp: ts(),
                };
              }
            } catch (llmError) {
              this.logger.warn({
                event: 'clean_chunk_llm_error',
                chunkId,
                error: llmError instanceof Error ? llmError.message : 'Unknown',
              });
              // Skip this chunk, continue with next
            }
          }
        }

        cursor = result.next_page_offset;
        if (cursor === null || cursor === undefined) break;
      }

      yield {
        type: 'clean_complete' as const,
        totalScanned,
        totalDeleted,
        totalCleaned,
        remaining: totalScanned - totalDeleted,
        breakdown,
        timestamp: ts(),
      };

      const duration = Date.now() - startTime;
      this.logger.log({
        event: 'clean_collection_success',
        collectionId,
        totalScanned,
        totalDeleted,
        totalCleaned,
        breakdown,
        durationMs: duration,
      });
    } catch (error) {
      this.logger.error({
        event: 'clean_collection_failure',
        collectionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      yield {
        type: 'error' as const,
        message: error instanceof Error ? error.message : 'Unknown cleaning error',
        timestamp: ts(),
      };
    }
  }
}
