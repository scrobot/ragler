import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LlmService } from '@llm/llm.service';
import { SettingsService } from '@modules/settings/settings.service';
import { RefineScenario } from '@llm/dto';
import {
  LlmChunkingValidationError,
  LlmChunkingRateLimitError,
  LlmChunkingTimeoutError,
  LlmChunkingParseError,
  LlmChunkingApiError,
} from '@llm/errors/llm-chunking.errors';
import {
  LlmEmbeddingValidationError,
  LlmEmbeddingRateLimitError,
  LlmEmbeddingTimeoutError,
  LlmEmbeddingApiError,
} from '@llm/errors/llm-embedding.errors';

// Mock OpenAI
const mockCreate = jest.fn();
const mockEmbeddingsCreate = jest.fn();

// Mock error classes - these simulate OpenAI SDK error types
class MockAPIConnectionTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'APIConnectionTimeoutError';
  }
}
class MockRateLimitError extends Error {
  headers?: Record<string, string>;
  constructor(message: string, headers?: Record<string, string>) {
    super(message);
    this.name = 'RateLimitError';
    this.headers = headers;
  }
}
class MockAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}
class MockInternalServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InternalServerError';
  }
}
class MockAPIError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}
class MockLengthFinishReasonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LengthFinishReasonError';
  }
}

jest.mock('openai', () => {
  const mockOpenAI = jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
    embeddings: {
      create: mockEmbeddingsCreate,
    },
  }));

  return {
    __esModule: true,
    default: mockOpenAI,
  };
});

// Helper to create mock chunking response
function createChunkingResponse(
  chunks: Array<{ id: string; text: string; is_dirty: boolean }>,
) {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify({ chunks }),
          refusal: null,
        },
      },
    ],
  };
}

const mockSettingsService = {
  getEffectiveApiKey: jest.fn().mockResolvedValue('test-api-key'),
  getEffectiveModel: jest.fn().mockResolvedValue('gpt-4o'),
};

describe('LlmService', () => {
  let service: LlmService;
  let mockConfigService: jest.Mocked<Pick<ConfigService, 'get'>>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, unknown> = {
          'openai.apiKey': 'test-api-key',
          'llm.chunking.timeout': 60000,
          'llm.chunking.maxRetries': 2,
          'llm.chunking.maxContentLength': 30000,
          'llm.embedding.timeout': 30000,
          'llm.embedding.maxRetries': 2,
          'llm.embedding.batchSize': 100,
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    }).compile();

    service = module.get<LlmService>(LlmService);
  });

  afterEach(() => {
    mockCreate.mockReset();
    mockEmbeddingsCreate.mockReset();
  });

  describe('chunkContent', () => {
    const mockValidResponse = createChunkingResponse([
      { id: 'temp_1', text: 'First chunk content.', is_dirty: false },
      { id: 'temp_2', text: 'Second chunk content.', is_dirty: false },
    ]);

    describe('happy path', () => {
      it('should call OpenAI with GPT-4o model', async () => {
        mockCreate.mockResolvedValue(mockValidResponse);

        await service.chunkContent('Some content to chunk');

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            model: 'gpt-4o',
          }),
          expect.any(Object),
        );
      });

      it('should use structured output with response_format', async () => {
        mockCreate.mockResolvedValue(mockValidResponse);

        await service.chunkContent('Some content');

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            response_format: expect.objectContaining({
              type: 'json_schema',
            }),
          }),
          expect.any(Object),
        );
      });

      it('should return array of ChunkDto objects', async () => {
        mockCreate.mockResolvedValue(mockValidResponse);

        const result = await service.chunkContent('Content to chunk');

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          id: 'temp_1',
          text: 'First chunk content.',
          isDirty: false,
        });
        expect(result[1]).toEqual({
          id: 'temp_2',
          text: 'Second chunk content.',
          isDirty: false,
        });
      });

      it('should use system prompt for chunking instructions', async () => {
        mockCreate.mockResolvedValue(mockValidResponse);

        await service.chunkContent('Content to chunk');

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({
                role: 'system',
                content: expect.stringContaining('document chunking'),
              }),
            ]),
          }),
          expect.any(Object),
        );
      });

      it('should include content in user message', async () => {
        mockCreate.mockResolvedValue(mockValidResponse);
        const content = 'This is the content to be chunked.';

        await service.chunkContent(content);

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({
                role: 'user',
                content: content,
              }),
            ]),
          }),
          expect.any(Object),
        );
      });

      it('should assign sequential temp_N ids', async () => {
        mockCreate.mockResolvedValue(
          createChunkingResponse([
            { id: 'temp_1', text: 'Chunk A', is_dirty: false },
            { id: 'temp_2', text: 'Chunk B', is_dirty: false },
            { id: 'temp_3', text: 'Chunk C', is_dirty: false },
          ]),
        );

        const result = await service.chunkContent('Content');

        expect(result[0].id).toBe('temp_1');
        expect(result[1].id).toBe('temp_2');
        expect(result[2].id).toBe('temp_3');
      });

      it('should set isDirty to false for all chunks', async () => {
        mockCreate.mockResolvedValue(mockValidResponse);

        const result = await service.chunkContent('Content');

        result.forEach((chunk) => {
          expect(chunk.isDirty).toBe(false);
        });
      });

      it('should handle single chunk response', async () => {
        mockCreate.mockResolvedValue(
          createChunkingResponse([
            { id: 'temp_1', text: 'Single chunk content', is_dirty: false },
          ]),
        );

        const result = await service.chunkContent('Short content');

        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Single chunk content');
      });
    });

    describe('input validation', () => {
      it('should throw LlmChunkingValidationError for empty content', async () => {
        await expect(service.chunkContent('')).rejects.toThrow(
          LlmChunkingValidationError,
        );
      });

      it('should throw LlmChunkingValidationError for whitespace-only content', async () => {
        await expect(service.chunkContent('   \n\n   ')).rejects.toThrow(
          LlmChunkingValidationError,
        );
      });

      it('should include descriptive message for validation error', async () => {
        await expect(service.chunkContent('')).rejects.toThrow(
          /empty|whitespace/i,
        );
      });
    });

    describe('long content handling', () => {
      it('should handle content under max length in single request', async () => {
        mockCreate.mockResolvedValue(mockValidResponse);
        const content = 'A'.repeat(1000); // Under 30k limit

        await service.chunkContent(content);

        expect(mockCreate).toHaveBeenCalledTimes(1);
      });

      // Test windowing with a separate service instance using lower maxContentLength
      it('should split content over max length into windows', async () => {
        // Create service with low maxContentLength for testing windowing
        const lowLimitConfigService = {
          get: jest.fn().mockImplementation((key: string) => {
            const config: Record<string, unknown> = {
              'openai.apiKey': 'test-api-key',
              'llm.chunking.timeout': 60000,
              'llm.chunking.maxRetries': 2,
              'llm.chunking.maxContentLength': 100, // Very low limit for testing
            };
            return config[key];
          }),
        };

        const module = await Test.createTestingModule({
          providers: [
            LlmService,
            { provide: ConfigService, useValue: lowLimitConfigService },
            { provide: SettingsService, useValue: mockSettingsService },
          ],
        }).compile();

        const lowLimitService = module.get<LlmService>(LlmService);

        mockCreate.mockResolvedValue(
          createChunkingResponse([
            { id: 'temp_1', text: 'Chunk', is_dirty: false },
          ]),
        );

        // Content over 100 char limit - should trigger windowing
        const content = 'A'.repeat(200);

        await lowLimitService.chunkContent(content);

        // Should be called multiple times for windowed content
        expect(mockCreate.mock.calls.length).toBeGreaterThan(1);
      });

      it('should deduplicate chunks from multiple windows', async () => {
        // Create service with low maxContentLength for testing deduplication
        const lowLimitConfigService = {
          get: jest.fn().mockImplementation((key: string) => {
            const config: Record<string, unknown> = {
              'openai.apiKey': 'test-api-key',
              'llm.chunking.timeout': 60000,
              'llm.chunking.maxRetries': 2,
              'llm.chunking.maxContentLength': 100, // Very low limit for testing
            };
            return config[key];
          }),
        };

        const module = await Test.createTestingModule({
          providers: [
            LlmService,
            { provide: ConfigService, useValue: lowLimitConfigService },
            { provide: SettingsService, useValue: mockSettingsService },
          ],
        }).compile();

        const lowLimitService = module.get<LlmService>(LlmService);

        // All windows return the same "overlap" chunk which should be deduped
        mockCreate.mockResolvedValue(
          createChunkingResponse([
            { id: 'temp_1', text: 'Same chunk in all windows', is_dirty: false },
          ]),
        );

        const content = 'A'.repeat(200);
        const result = await lowLimitService.chunkContent(content);

        // Multiple windows all return the same chunk, should be deduped to 1
        expect(result.length).toBe(1);
        // ID should be temp_1
        expect(result[0].id).toBe('temp_1');
        expect(result[0].text).toBe('Same chunk in all windows');
      });
    });

    describe('error handling', () => {
      it('should throw LlmChunkingRateLimitError on 429', async () => {
        const rateLimitError = new MockRateLimitError('Rate limit');
        mockCreate.mockRejectedValue(rateLimitError);

        await expect(service.chunkContent('Content')).rejects.toThrow(
          LlmChunkingRateLimitError,
        );
      });

      it('should include retry-after in rate limit error when available', async () => {
        const rateLimitError = new MockRateLimitError('Rate limit', {
          'retry-after': '30',
        });
        mockCreate.mockRejectedValue(rateLimitError);

        try {
          await service.chunkContent('Content');
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(LlmChunkingRateLimitError);
          expect((error as LlmChunkingRateLimitError).message).toContain('30');
        }
      });

      it('should throw LlmChunkingTimeoutError on timeout', async () => {
        const timeoutError = new MockAPIConnectionTimeoutError('Timeout');
        mockCreate.mockRejectedValue(timeoutError);

        await expect(service.chunkContent('Content')).rejects.toThrow(
          LlmChunkingTimeoutError,
        );
      });

      it('should throw LlmChunkingParseError on model refusal', async () => {
        mockCreate.mockResolvedValue({
          choices: [
            {
              message: {
                content: null,
                refusal: 'I cannot process this content',
              },
            },
          ],
        });

        await expect(service.chunkContent('Content')).rejects.toThrow(
          LlmChunkingParseError,
        );
      });

      it('should throw LlmChunkingParseError when content is null', async () => {
        mockCreate.mockResolvedValue({
          choices: [
            {
              message: {
                content: null,
                refusal: null,
              },
            },
          ],
        });

        await expect(service.chunkContent('Content')).rejects.toThrow(
          LlmChunkingParseError,
        );
      });

      it('should throw LlmChunkingParseError on invalid JSON', async () => {
        mockCreate.mockResolvedValue({
          choices: [
            {
              message: {
                content: 'not valid json',
                refusal: null,
              },
            },
          ],
        });

        await expect(service.chunkContent('Content')).rejects.toThrow(
          LlmChunkingParseError,
        );
      });

      it('should throw LlmChunkingApiError on OpenAI server error', async () => {
        const serverError = new MockInternalServerError('Server error');
        mockCreate.mockRejectedValue(serverError);

        await expect(service.chunkContent('Content')).rejects.toThrow(
          LlmChunkingApiError,
        );
      });

      it('should mark server errors as retryable', async () => {
        const serverError = new MockInternalServerError('Server error');
        mockCreate.mockRejectedValue(serverError);

        try {
          await service.chunkContent('Content');
          fail('Should have thrown');
        } catch (error) {
          expect((error as LlmChunkingApiError).isRetryable).toBe(true);
        }
      });

      it('should throw LlmChunkingApiError on auth error', async () => {
        const authError = new MockAuthenticationError('Invalid API key');
        mockCreate.mockRejectedValue(authError);

        await expect(service.chunkContent('Content')).rejects.toThrow(
          LlmChunkingApiError,
        );
      });

      it('should mark auth errors as non-retryable', async () => {
        const authError = new MockAuthenticationError('Invalid API key');
        mockCreate.mockRejectedValue(authError);

        try {
          await service.chunkContent('Content');
          fail('Should have thrown');
        } catch (error) {
          expect((error as LlmChunkingApiError).isRetryable).toBe(false);
        }
      });

      it('should throw LlmChunkingParseError on length finish reason', async () => {
        const lengthError = new MockLengthFinishReasonError('Response truncated');
        mockCreate.mockRejectedValue(lengthError);

        await expect(service.chunkContent('Content')).rejects.toThrow(
          LlmChunkingParseError,
        );
      });

      it('should throw LlmChunkingApiError on generic API error with 5xx status', async () => {
        const apiError = new MockAPIError('Bad gateway', 502);
        mockCreate.mockRejectedValue(apiError);

        try {
          await service.chunkContent('Content');
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(LlmChunkingApiError);
          expect((error as LlmChunkingApiError).isRetryable).toBe(true);
        }
      });

      it('should throw LlmChunkingApiError on generic API error with 4xx status', async () => {
        const apiError = new MockAPIError('Bad request', 400);
        mockCreate.mockRejectedValue(apiError);

        try {
          await service.chunkContent('Content');
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(LlmChunkingApiError);
          expect((error as LlmChunkingApiError).isRetryable).toBe(false);
        }
      });
    });

    describe('timeout configuration', () => {
      it('should use configured timeout', async () => {
        mockCreate.mockResolvedValue(mockValidResponse);

        await service.chunkContent('Content');

        expect(mockCreate).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            timeout: 60000,
          }),
        );
      });

      it('should use configured maxRetries', async () => {
        mockCreate.mockResolvedValue(mockValidResponse);

        await service.chunkContent('Content');

        expect(mockCreate).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            maxRetries: 2,
          }),
        );
      });
    });

    describe('correlation ID', () => {
      it('should accept optional correlation ID parameter', async () => {
        mockCreate.mockResolvedValue(mockValidResponse);

        // Should not throw
        await service.chunkContent('Content', 'correlation-123');

        expect(mockCreate).toHaveBeenCalled();
      });
    });
  });

  describe('refineText', () => {
    const scenarios: RefineScenario[] = [
      'simplify',
      'clarify_terms',
      'add_examples',
      'rewrite_for_audience',
    ];

    it.each(scenarios)(
      'should call OpenAI with correct prompt for %s scenario',
      async (scenario) => {
        mockCreate.mockResolvedValue({
          choices: [{ message: { content: 'Refined text' } }],
        });

        await service.refineText('Original text', scenario);

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            model: 'gpt-4o-mini',
            messages: expect.arrayContaining([
              expect.objectContaining({ role: 'system' }),
              expect.objectContaining({
                role: 'user',
                content: expect.stringContaining('Original text'),
              }),
            ]),
            max_tokens: 2000,
          }),
        );
      },
    );

    it('should include target audience in rewrite_for_audience prompt', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Refined for developers' } }],
      });

      await service.refineText(
        'Technical content',
        'rewrite_for_audience',
        'software developers',
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('software developers'),
            }),
          ]),
        }),
      );
    });

    it('should use "general audience" when targetAudience not provided for rewrite_for_audience', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Refined for general audience' } }],
      });

      await service.refineText('Technical content', 'rewrite_for_audience');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('general audience'),
            }),
          ]),
        }),
      );
    });

    it('should return refined text from OpenAI response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'This is the refined text.' } }],
      });

      const result = await service.refineText('Original text', 'simplify');

      expect(result).toBe('This is the refined text.');
    });

    it('should return original text when OpenAI returns empty content', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const result = await service.refineText('Original text', 'simplify');

      expect(result).toBe('Original text');
    });

    it('should return original text when OpenAI returns empty string', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '' } }],
      });

      const result = await service.refineText('Original text', 'simplify');

      expect(result).toBe('Original text');
    });

    it('should throw error when OpenAI API fails', async () => {
      const apiError = new Error('OpenAI API rate limit exceeded');
      mockCreate.mockRejectedValue(apiError);

      await expect(service.refineText('Text', 'simplify')).rejects.toThrow(
        'OpenAI API rate limit exceeded',
      );
    });

    it('should include system message for text improvement', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Improved text' } }],
      });

      await service.refineText('Original', 'clarify_terms');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('helpful assistant'),
            }),
          ]),
        }),
      );
    });
  });

  describe('generateEmbedding', () => {
    it('should call OpenAI embeddings API with correct parameters', async () => {
      const mockEmbedding = new Array(1536).fill(0.01);
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      });

      await service.generateEmbedding('Text to embed');

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'Text to embed',
      });
    });

    it('should return embedding array from OpenAI response', async () => {
      const mockEmbedding = new Array(1536).fill(0.01);
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      });

      const result = await service.generateEmbedding('Text to embed');

      expect(result).toEqual(mockEmbedding);
      expect(result).toHaveLength(1536);
    });

    it('should throw error when OpenAI API fails', async () => {
      const apiError = new Error('OpenAI API connection failed');
      mockEmbeddingsCreate.mockRejectedValue(apiError);

      await expect(service.generateEmbedding('Text')).rejects.toThrow(
        'OpenAI API connection failed',
      );
    });

    it('should handle long text input', async () => {
      const longText = 'A'.repeat(10000);
      const mockEmbedding = new Array(1536).fill(0.02);
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      });

      const result = await service.generateEmbedding(longText);

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: longText,
      });
      expect(result).toEqual(mockEmbedding);
    });
  });

  describe('generateEmbeddings (batch)', () => {
    const mockEmbedding1 = new Array(1536).fill(0.01);
    const mockEmbedding2 = new Array(1536).fill(0.02);
    const mockEmbedding3 = new Array(1536).fill(0.03);

    it('should call OpenAI embeddings API with array input', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [
          { embedding: mockEmbedding1 },
          { embedding: mockEmbedding2 },
        ],
      });

      await service.generateEmbeddings(['text1', 'text2']);

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'text-embedding-3-small',
          input: ['text1', 'text2'],
        }),
        expect.any(Object),
      );
    });

    it('should return embeddings in same order as input texts', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [
          { embedding: mockEmbedding1, index: 0 },
          { embedding: mockEmbedding2, index: 1 },
          { embedding: mockEmbedding3, index: 2 },
        ],
      });

      const result = await service.generateEmbeddings([
        'first text',
        'second text',
        'third text',
      ]);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(mockEmbedding1);
      expect(result[1]).toEqual(mockEmbedding2);
      expect(result[2]).toEqual(mockEmbedding3);
    });

    it('should return empty array for empty input', async () => {
      const result = await service.generateEmbeddings([]);

      expect(result).toEqual([]);
      expect(mockEmbeddingsCreate).not.toHaveBeenCalled();
    });

    it('should throw LlmEmbeddingValidationError for array with empty strings', async () => {
      await expect(
        service.generateEmbeddings(['valid text', '', 'also valid']),
      ).rejects.toThrow(LlmEmbeddingValidationError);
    });

    it('should throw LlmEmbeddingValidationError for array with whitespace-only strings', async () => {
      await expect(
        service.generateEmbeddings(['valid text', '   ', 'also valid']),
      ).rejects.toThrow(LlmEmbeddingValidationError);
    });

    it('should throw LlmEmbeddingRateLimitError on rate limit', async () => {
      const rateLimitError = new MockRateLimitError('Rate limit');
      mockEmbeddingsCreate.mockRejectedValue(rateLimitError);

      await expect(service.generateEmbeddings(['text'])).rejects.toThrow(
        LlmEmbeddingRateLimitError,
      );
    });

    it('should include retry-after in rate limit error when available', async () => {
      const rateLimitError = new MockRateLimitError('Rate limit', {
        'retry-after': '60',
      });
      mockEmbeddingsCreate.mockRejectedValue(rateLimitError);

      try {
        await service.generateEmbeddings(['text']);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LlmEmbeddingRateLimitError);
        expect((error as LlmEmbeddingRateLimitError).message).toContain('60');
      }
    });

    it('should throw LlmEmbeddingTimeoutError on timeout', async () => {
      const timeoutError = new MockAPIConnectionTimeoutError('Timeout');
      mockEmbeddingsCreate.mockRejectedValue(timeoutError);

      await expect(service.generateEmbeddings(['text'])).rejects.toThrow(
        LlmEmbeddingTimeoutError,
      );
    });

    it('should throw LlmEmbeddingApiError on OpenAI server error', async () => {
      const serverError = new MockInternalServerError('Server error');
      mockEmbeddingsCreate.mockRejectedValue(serverError);

      await expect(service.generateEmbeddings(['text'])).rejects.toThrow(
        LlmEmbeddingApiError,
      );
    });

    it('should mark server errors as retryable', async () => {
      const serverError = new MockInternalServerError('Server error');
      mockEmbeddingsCreate.mockRejectedValue(serverError);

      try {
        await service.generateEmbeddings(['text']);
        fail('Should have thrown');
      } catch (error) {
        expect((error as LlmEmbeddingApiError).isRetryable).toBe(true);
      }
    });

    it('should throw LlmEmbeddingApiError on auth error', async () => {
      const authError = new MockAuthenticationError('Invalid API key');
      mockEmbeddingsCreate.mockRejectedValue(authError);

      await expect(service.generateEmbeddings(['text'])).rejects.toThrow(
        LlmEmbeddingApiError,
      );
    });

    it('should mark auth errors as non-retryable', async () => {
      const authError = new MockAuthenticationError('Invalid API key');
      mockEmbeddingsCreate.mockRejectedValue(authError);

      try {
        await service.generateEmbeddings(['text']);
        fail('Should have thrown');
      } catch (error) {
        expect((error as LlmEmbeddingApiError).isRetryable).toBe(false);
      }
    });

    it('should use configured timeout', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding1 }],
      });

      await service.generateEmbeddings(['text']);

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          timeout: 30000,
        }),
      );
    });

    it('should use configured maxRetries', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding1 }],
      });

      await service.generateEmbeddings(['text']);

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          maxRetries: 2,
        }),
      );
    });

    it('should accept optional correlation ID parameter', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding1 }],
      });

      // Should not throw
      await service.generateEmbeddings(['text'], 'correlation-123');

      expect(mockEmbeddingsCreate).toHaveBeenCalled();
    });

    it('should handle single text input', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding1 }],
      });

      const result = await service.generateEmbeddings(['single text']);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockEmbedding1);
    });
  });

  describe('constructor', () => {
    it('should not read OpenAI API key from config (now uses SettingsService at call time)', () => {
      expect(mockConfigService.get).not.toHaveBeenCalledWith('openai.apiKey');
    });

    it('should read LLM chunking configuration', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'llm.chunking.timeout',
      );
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'llm.chunking.maxRetries',
      );
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'llm.chunking.maxContentLength',
      );
    });
  });
});
