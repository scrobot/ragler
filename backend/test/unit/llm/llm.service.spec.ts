import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LlmService } from '../../../src/modules/llm/llm.service';
import { RefineScenario } from '../../../src/modules/llm/dto';

// Mock OpenAI
const mockCreate = jest.fn();
const mockEmbeddingsCreate = jest.fn();

jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
      embeddings: {
        create: mockEmbeddingsCreate,
      },
    })),
  };
});

describe('LlmService', () => {
  let service: LlmService;
  let mockConfigService: jest.Mocked<Pick<ConfigService, 'get'>>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('test-api-key'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<LlmService>(LlmService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('chunkContent', () => {
    it('should split content by double newlines', async () => {
      const content = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';

      const result = await service.chunkContent(content);

      expect(result).toEqual(['First paragraph.', 'Second paragraph.', 'Third paragraph.']);
    });

    it('should handle multiple consecutive newlines', async () => {
      const content = 'First.\n\n\n\nSecond.';

      const result = await service.chunkContent(content);

      expect(result).toEqual(['First.', 'Second.']);
    });

    it('should trim whitespace from chunks', async () => {
      const content = '  First paragraph.  \n\n  Second paragraph.  ';

      const result = await service.chunkContent(content);

      expect(result).toEqual(['First paragraph.', 'Second paragraph.']);
    });

    it('should filter out empty chunks', async () => {
      const content = 'First.\n\n\n\n\n\nSecond.\n\n   \n\nThird.';

      const result = await service.chunkContent(content);

      expect(result).toEqual(['First.', 'Second.', 'Third.']);
    });

    it('should return single chunk for content without double newlines', async () => {
      const content = 'Single paragraph with no breaks.';

      const result = await service.chunkContent(content);

      expect(result).toEqual(['Single paragraph with no breaks.']);
    });

    it('should return empty array for empty content', async () => {
      const content = '';

      const result = await service.chunkContent(content);

      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only content', async () => {
      const content = '   \n\n   \n\n   ';

      const result = await service.chunkContent(content);

      expect(result).toEqual([]);
    });
  });

  describe('refineText', () => {
    const scenarios: RefineScenario[] = ['simplify', 'clarify_terms', 'add_examples', 'rewrite_for_audience'];

    it.each(scenarios)('should call OpenAI with correct prompt for %s scenario', async (scenario) => {
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
    });

    it('should include target audience in rewrite_for_audience prompt', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Refined for developers' } }],
      });

      await service.refineText('Technical content', 'rewrite_for_audience', 'software developers');

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

      await expect(service.refineText('Text', 'simplify')).rejects.toThrow('OpenAI API rate limit exceeded');
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

  describe('constructor', () => {
    it('should read OpenAI API key from config', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('openai.apiKey');
    });
  });
});
