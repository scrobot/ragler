import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  RefineScenario,
  LlmChunkResponseSchema,
  LlmChunkItem,
  ChunkDto,
} from './dto';
import {
  LlmChunkingValidationError,
  LlmChunkingRateLimitError,
  LlmChunkingTimeoutError,
  LlmChunkingParseError,
  LlmChunkingApiError,
} from './errors/llm-chunking.errors';
import {
  LlmEmbeddingValidationError,
  LlmEmbeddingRateLimitError,
  LlmEmbeddingTimeoutError,
  LlmEmbeddingApiError,
} from './errors/llm-embedding.errors';

// JSON Schema for the chunking response (matches LlmChunkResponseSchema)
const CHUNK_RESPONSE_SCHEMA = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'chunk_response',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        chunks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                pattern: '^temp_\\d+$',
                description: 'Chunk ID in format temp_N',
              },
              text: {
                type: 'string',
                minLength: 1,
                description: 'Chunk text content',
              },
              is_dirty: {
                type: 'boolean',
                description: 'Whether the chunk has been modified',
              },
            },
            required: ['id', 'text', 'is_dirty'],
            additionalProperties: false,
          },
          minItems: 1,
        },
      },
      required: ['chunks'],
      additionalProperties: false,
    },
  },
};

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly openai: OpenAI;
  private readonly chunkingTimeout: number;
  private readonly chunkingMaxRetries: number;
  private readonly maxContentLength: number;
  private readonly embeddingTimeout: number;
  private readonly embeddingMaxRetries: number;
  private readonly embeddingBatchSize: number;

  private readonly CHUNKING_SYSTEM_PROMPT = `You are a document chunking specialist. Your task is to split the provided content into semantically meaningful chunks for a knowledge retrieval system.

Guidelines:
1. Each chunk should represent a complete, self-contained piece of information
2. Preserve logical boundaries (sections, paragraphs, topic shifts)
3. Keep related information together (don't split mid-explanation)
4. Target chunk size: 200-1000 characters, but prioritize semantic coherence over size
5. Each chunk should be independently understandable

Rules:
- IDs must be sequential: temp_1, temp_2, temp_3, etc.
- is_dirty must always be false (initial state)
- If content cannot be chunked meaningfully, return a single chunk with all content`;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('openai.apiKey');
    this.openai = new OpenAI({ apiKey });
    this.chunkingTimeout =
      this.configService.get<number>('llm.chunking.timeout') ?? 60000;
    this.chunkingMaxRetries =
      this.configService.get<number>('llm.chunking.maxRetries') ?? 2;
    this.maxContentLength =
      this.configService.get<number>('llm.chunking.maxContentLength') ?? 30000;
    this.embeddingTimeout =
      this.configService.get<number>('llm.embedding.timeout') ?? 30000;
    this.embeddingMaxRetries =
      this.configService.get<number>('llm.embedding.maxRetries') ?? 2;
    this.embeddingBatchSize =
      this.configService.get<number>('llm.embedding.batchSize') ?? 100;
  }

  async chunkContent(
    content: string,
    correlationId?: string,
  ): Promise<ChunkDto[]> {
    const startTime = Date.now();
    const logContext = { correlationId, contentLength: content.length };

    // Validation
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      throw new LlmChunkingValidationError(
        'Content cannot be empty or whitespace-only',
      );
    }

    this.logger.log({
      event: 'chunking_start',
      ...logContext,
    });

    try {
      let allChunks: ChunkDto[];

      if (trimmedContent.length <= this.maxContentLength) {
        allChunks = await this.chunkSingleRequest(trimmedContent);
      } else {
        allChunks = await this.chunkWithWindowing(trimmedContent);
      }

      const duration = Date.now() - startTime;
      this.logger.log({
        event: 'chunking_success',
        ...logContext,
        chunkCount: allChunks.length,
        durationMs: duration,
      });

      return allChunks;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error({
        event: 'chunking_failure',
        ...logContext,
        durationMs: duration,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        isRetryable: this.isRetryableError(error),
      });
      throw error;
    }
  }

  private async chunkSingleRequest(content: string): Promise<ChunkDto[]> {
    try {
      const completion = await this.openai.chat.completions.create(
        {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: this.CHUNKING_SYSTEM_PROMPT },
            { role: 'user', content },
          ],
          response_format: CHUNK_RESPONSE_SCHEMA,
        },
        {
          timeout: this.chunkingTimeout,
          maxRetries: this.chunkingMaxRetries,
        },
      );

      const message = completion.choices[0]?.message;

      // Check for refusal
      if (message?.refusal) {
        throw new LlmChunkingParseError(
          `Model refused to chunk: ${message.refusal}`,
        );
      }

      // Parse the JSON response
      const responseContent = message?.content;
      if (!responseContent) {
        throw new LlmChunkingParseError('Empty response from model');
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(responseContent);
      } catch {
        throw new LlmChunkingParseError(
          'Failed to parse chunking response as JSON',
          responseContent,
        );
      }

      // Validate with Zod schema
      const validationResult = LlmChunkResponseSchema.safeParse(parsed);
      if (!validationResult.success) {
        throw new LlmChunkingParseError(
          `Invalid chunking response: ${validationResult.error.message}`,
          responseContent,
        );
      }

      return this.transformToChunkDto(validationResult.data.chunks);
    } catch (error) {
      throw this.mapOpenAiError(error);
    }
  }

  private async chunkWithWindowing(content: string): Promise<ChunkDto[]> {
    // Overlap should not exceed half the window size to ensure progress
    const OVERLAP = Math.min(500, Math.floor(this.maxContentLength / 2));
    const windows: string[] = [];
    let start = 0;

    while (start < content.length) {
      const end = Math.min(start + this.maxContentLength, content.length);
      windows.push(content.slice(start, end));
      // Ensure we always make forward progress
      const nextStart = end - OVERLAP;
      start = Math.max(nextStart, start + 1);
      if (end >= content.length) break;
    }

    const allChunks: ChunkDto[] = [];
    for (const window of windows) {
      const windowChunks = await this.chunkSingleRequest(window);
      allChunks.push(...windowChunks);
    }

    // Deduplicate and renumber
    return this.deduplicateAndRenumber(allChunks);
  }

  private transformToChunkDto(llmChunks: LlmChunkItem[]): ChunkDto[] {
    return llmChunks.map((chunk, index) => ({
      id: `temp_${index + 1}`,
      text: chunk.text,
      isDirty: false,
    }));
  }

  private deduplicateAndRenumber(chunks: ChunkDto[]): ChunkDto[] {
    const seen = new Set<string>();
    const unique = chunks.filter((chunk) => {
      const key = chunk.text.slice(0, 100); // Use first 100 chars as key
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.map((chunk, index) => ({
      ...chunk,
      id: `temp_${index + 1}`,
    }));
  }

  private mapOpenAiError(error: unknown): Error {
    // Already our custom error - rethrow
    if (
      error instanceof LlmChunkingValidationError ||
      error instanceof LlmChunkingParseError ||
      error instanceof LlmChunkingRateLimitError ||
      error instanceof LlmChunkingTimeoutError ||
      error instanceof LlmChunkingApiError
    ) {
      return error;
    }

    // Check error name for OpenAI error types
    // Uses error.name which works with both real OpenAI errors and mocks
    if (error instanceof Error) {
      const errorName = error.name;

      if (errorName === 'APIConnectionTimeoutError') {
        return new LlmChunkingTimeoutError(this.chunkingTimeout);
      }

      if (errorName === 'RateLimitError') {
        const headers = (error as { headers?: Record<string, string> }).headers;
        const retryAfter = headers?.['retry-after'];
        return new LlmChunkingRateLimitError(
          retryAfter ? parseInt(retryAfter, 10) : undefined,
        );
      }

      if (errorName === 'AuthenticationError') {
        return new LlmChunkingApiError('Invalid OpenAI API key', false, error);
      }

      if (errorName === 'InternalServerError') {
        return new LlmChunkingApiError(
          `OpenAI server error: ${error.message}`,
          true,
          error,
        );
      }

      if (errorName === 'LengthFinishReasonError') {
        return new LlmChunkingParseError('Response truncated due to length');
      }

      if (errorName === 'APIError') {
        const status = (error as { status?: number }).status;
        const isRetryable = status !== undefined && status >= 500;
        return new LlmChunkingApiError(error.message, isRetryable, error);
      }
    }

    // Unknown error
    return new LlmChunkingApiError(
      error instanceof Error ? error.message : 'Unknown chunking error',
      false,
      error instanceof Error ? error : undefined,
    );
  }

  private isRetryableError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'isRetryable' in error) {
      return (error as { isRetryable: boolean }).isRetryable;
    }
    return false;
  }

  async refineText(
    text: string,
    scenario: RefineScenario,
    targetAudience?: string,
  ): Promise<string> {
    this.logger.log(`Refining text with scenario: ${scenario}`);

    const prompts: Record<RefineScenario, string> = {
      simplify: `Simplify the following text while preserving its meaning:\n\n${text}`,
      clarify_terms: `Clarify technical terms and jargon in the following text:\n\n${text}`,
      add_examples: `Add clarifying examples to the following text:\n\n${text}`,
      rewrite_for_audience: `Rewrite the following text for ${targetAudience || 'general audience'}:\n\n${text}`,
    };

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that improves text clarity and readability. Return only the improved text without explanations.',
          },
          {
            role: 'user',
            content: prompts[scenario],
          },
        ],
        max_tokens: 2000,
      });

      return response.choices[0]?.message?.content || text;
    } catch (error) {
      this.logger.error('Failed to refine text', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    this.logger.log('Generating embedding');

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding', error);
      throw error;
    }
  }

  async generateEmbeddings(
    texts: string[],
    correlationId?: string,
  ): Promise<number[][]> {
    const startTime = Date.now();
    const logContext = { correlationId, textCount: texts.length };

    // Handle empty array
    if (texts.length === 0) {
      return [];
    }

    // Validate all texts are non-empty
    for (let i = 0; i < texts.length; i++) {
      if (!texts[i].trim()) {
        throw new LlmEmbeddingValidationError(
          `Text at index ${i} cannot be empty or whitespace-only`,
        );
      }
    }

    this.logger.log({
      event: 'embedding_batch_start',
      ...logContext,
    });

    try {
      const response = await this.openai.embeddings.create(
        {
          model: 'text-embedding-3-small',
          input: texts,
        },
        {
          timeout: this.embeddingTimeout,
          maxRetries: this.embeddingMaxRetries,
        },
      );

      // OpenAI returns embeddings in the same order as input
      // but we'll sort by index to be safe
      const sortedData = response.data.sort((a, b) => a.index - b.index);
      const embeddings = sortedData.map((item) => item.embedding);

      const duration = Date.now() - startTime;
      this.logger.log({
        event: 'embedding_batch_success',
        ...logContext,
        durationMs: duration,
      });

      return embeddings;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error({
        event: 'embedding_batch_failure',
        ...logContext,
        durationMs: duration,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        isRetryable: this.isRetryableError(error),
      });
      throw this.mapEmbeddingOpenAiError(error);
    }
  }

  private mapEmbeddingOpenAiError(error: unknown): Error {
    // Already our custom error - rethrow
    if (
      error instanceof LlmEmbeddingValidationError ||
      error instanceof LlmEmbeddingRateLimitError ||
      error instanceof LlmEmbeddingTimeoutError ||
      error instanceof LlmEmbeddingApiError
    ) {
      return error;
    }

    // Check error name for OpenAI error types
    if (error instanceof Error) {
      const errorName = error.name;

      if (errorName === 'APIConnectionTimeoutError') {
        return new LlmEmbeddingTimeoutError(this.embeddingTimeout);
      }

      if (errorName === 'RateLimitError') {
        const headers = (error as { headers?: Record<string, string> }).headers;
        const retryAfter = headers?.['retry-after'];
        return new LlmEmbeddingRateLimitError(
          retryAfter ? parseInt(retryAfter, 10) : undefined,
        );
      }

      if (errorName === 'AuthenticationError') {
        return new LlmEmbeddingApiError('Invalid OpenAI API key', false, error);
      }

      if (errorName === 'InternalServerError') {
        return new LlmEmbeddingApiError(
          `OpenAI server error: ${error.message}`,
          true,
          error,
        );
      }

      if (errorName === 'APIError') {
        const status = (error as { status?: number }).status;
        const isRetryable = status !== undefined && status >= 500;
        return new LlmEmbeddingApiError(error.message, isRetryable, error);
      }
    }

    // Unknown error
    return new LlmEmbeddingApiError(
      error instanceof Error ? error.message : 'Unknown embedding error',
      false,
      error instanceof Error ? error : undefined,
    );
  }
}
