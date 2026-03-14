import OpenAI from 'openai';
import { LLMTagExtractor } from '@llm/extractors/tag-extractor';

// Mock OpenAI at module level
jest.mock('openai');

describe('LLMTagExtractor', () => {
  let extractor: LLMTagExtractor;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    mockCreate = jest.fn();
    const mockOpenAI = {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    } as unknown as OpenAI;

    extractor = new LLMTagExtractor(mockOpenAI, {
      model: 'gpt-4o-mini',
      timeout: 5000,
      maxRetries: 1,
    });
  });

  describe('extractTags', () => {
    it('should return normalized tags from LLM response', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                tags: ['NestJS', 'TypeScript', 'REST API', 'Docker'],
              }),
            },
          },
        ],
      });

      const tags = await extractor.extractTags('Building a NestJS REST API with TypeScript and Docker containers.');

      expect(tags).toHaveLength(4);
      // Tags should be normalized (lowercase, kebab-case)
      expect(tags).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^[a-z0-9][a-z0-9\-.]*$/),
        ]),
      );
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should return empty array for empty text', async () => {
      const tags = await extractor.extractTags('');
      expect(tags).toEqual([]);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should return empty array for whitespace-only text', async () => {
      const tags = await extractor.extractTags('   \n\t  ');
      expect(tags).toEqual([]);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should deduplicate tags', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                tags: ['nestjs', 'NestJS', 'NESTJS', 'typescript', 'TypeScript'],
              }),
            },
          },
        ],
      });

      const tags = await extractor.extractTags('NestJS with TypeScript');

      // After normalization, duplicates should be removed
      const uniqueTags = new Set(tags);
      expect(tags.length).toBe(uniqueTags.size);
    });

    it('should cap result at 12 tags', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                tags: Array.from({ length: 12 }, (_, i) => `tag-${i}`),
              }),
            },
          },
        ],
      });

      const tags = await extractor.extractTags('A very rich document.');
      expect(tags.length).toBeLessThanOrEqual(12);
    });

    it('should include context in prompt when provided', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ tags: ['testing', 'context'] }),
            },
          },
        ],
      });

      await extractor.extractTags('Some text', {
        title: 'Test Document',
        headingPath: ['Chapter 1', 'Section 1.1'],
      });

      const callArgs = mockCreate.mock.calls[0][0];
      const userMessage = callArgs.messages[1].content;
      expect(userMessage).toContain('Test Document');
      expect(userMessage).toContain('Chapter 1 > Section 1.1');
    });

    it('should truncate long text to 2000 chars', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ tags: ['long', 'text'] }),
            },
          },
        ],
      });

      const longText = 'A'.repeat(5000);
      await extractor.extractTags(longText);

      const callArgs = mockCreate.mock.calls[0][0];
      const userMessage = callArgs.messages[1].content;
      // Should contain truncated text + ellipsis
      expect(userMessage).toContain('...');
      // Total message minus prompt should be roughly 2000
      expect(userMessage.length).toBeLessThan(5000);
    });

    it('should return empty array on LLM error', async () => {
      mockCreate.mockRejectedValue(new Error('Rate limit exceeded'));

      const tags = await extractor.extractTags('Some valid text');
      expect(tags).toEqual([]);
    });

    it('should return empty array on empty LLM response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const tags = await extractor.extractTags('Some text');
      expect(tags).toEqual([]);
    });

    it('should return empty array on invalid JSON response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'not json' } }],
      });

      const tags = await extractor.extractTags('Some text');
      expect(tags).toEqual([]);
    });

    it('should return empty array on schema validation failure', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ tags: ['a', 'b'] }), // less than 3 tags — Zod min(3)
            },
          },
        ],
      });

      const tags = await extractor.extractTags('Text');
      expect(tags).toEqual([]);
    });

    it('should use correct model and parameters', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ tags: ['tag1', 'tag2', 'tag3'] }),
            },
          },
        ],
      });

      await extractor.extractTags('Text');

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe('gpt-4o-mini');
      expect(callArgs.temperature).toBe(0.3);
      expect(callArgs.max_tokens).toBe(150);
      expect(callArgs.response_format.type).toBe('json_schema');
    });

    it('should pass timeout and maxRetries options', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ tags: ['a', 'b', 'c'] }),
            },
          },
        ],
      });

      await extractor.extractTags('Text');

      const requestOptions = mockCreate.mock.calls[0][1];
      expect(requestOptions.timeout).toBe(5000);
      expect(requestOptions.maxRetries).toBe(1);
    });
  });

  describe('extractTagsBatch', () => {
    it('should extract tags for multiple texts in parallel', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ tags: ['common', 'tag', 'here'] }),
            },
          },
        ],
      });

      const results = await extractor.extractTagsBatch(
        ['Text one', 'Text two', 'Text three'],
        [{ title: 'Doc1' }, { title: 'Doc2' }, { title: 'Doc3' }],
      );

      expect(results).toHaveLength(3);
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('should handle empty batch', async () => {
      const results = await extractor.extractTagsBatch([]);
      expect(results).toEqual([]);
    });

    it('should handle partial failures gracefully', async () => {
      mockCreate
        .mockResolvedValueOnce({
          choices: [
            { message: { content: JSON.stringify({ tags: ['ok', 'tag', 'here'] }) } },
          ],
        })
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce({
          choices: [
            { message: { content: JSON.stringify({ tags: ['also', 'ok', 'fine'] }) } },
          ],
        });

      const results = await extractor.extractTagsBatch(['Text1', 'Text2', 'Text3']);

      expect(results).toHaveLength(3);
      expect(results[0].length).toBeGreaterThan(0); // success
      expect(results[1]).toEqual([]);                // failure → empty
      expect(results[2].length).toBeGreaterThan(0); // success
    });
  });

  describe('constructor defaults', () => {
    it('should use default options when none provided', () => {
      const mockOpenAI = {
        chat: { completions: { create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify({ tags: ['a', 'b', 'c'] }) } }],
        }) } },
      } as unknown as OpenAI;

      const defaultExtractor = new LLMTagExtractor(mockOpenAI);

      // Just verify it constructs without error
      expect(defaultExtractor).toBeDefined();
    });
  });
});
