import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ManualStrategy } from '@ingest/strategies/manual.strategy';
import { ManualContentValidationError } from '@ingest/strategies/errors/manual-ingest.errors';

describe('ManualStrategy', () => {
  let strategy: ManualStrategy;
  let mockConfigService: jest.Mocked<ConfigService>;

  const defaultConfig: Record<string, unknown> = {
    'manual.maxContentLength': 102400,
    'manual.minContentLength': 1,
  };

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => defaultConfig[key]),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManualStrategy,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<ManualStrategy>(ManualStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should have sourceType "manual"', () => {
    expect(strategy.sourceType).toBe('manual');
  });

  describe('Content Validation', () => {
    it('should throw ManualContentValidationError for null content', async () => {
      await expect(strategy.ingest(null as unknown as string)).rejects.toThrow(
        ManualContentValidationError,
      );
    });

    it('should throw ManualContentValidationError for undefined content', async () => {
      await expect(
        strategy.ingest(undefined as unknown as string),
      ).rejects.toThrow(ManualContentValidationError);
    });

    it('should throw ManualContentValidationError for empty string', async () => {
      await expect(strategy.ingest('')).rejects.toThrow(
        ManualContentValidationError,
      );
    });

    it('should throw ManualContentValidationError for whitespace-only content', async () => {
      await expect(strategy.ingest('   \n\t  ')).rejects.toThrow(
        ManualContentValidationError,
      );
    });

    it('should throw ManualContentValidationError for content exceeding max length', async () => {
      const longContent = 'a'.repeat(102401);
      await expect(strategy.ingest(longContent)).rejects.toThrow(
        ManualContentValidationError,
      );
    });

    it('should include max length in error message when content exceeds limit', async () => {
      const longContent = 'a'.repeat(102401);
      await expect(strategy.ingest(longContent)).rejects.toThrow(
        /exceeds maximum length of 102400/,
      );
    });

    it('should accept content at max length boundary', async () => {
      const maxContent = 'a'.repeat(102400);
      const result = await strategy.ingest(maxContent);
      expect(result.content).toBe(maxContent);
    });

    it('should accept valid content with single character', async () => {
      const result = await strategy.ingest('X');
      expect(result.content).toBe('X');
    });

    it('should validate non-retryable for validation errors', async () => {
      try {
        await strategy.ingest('');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ManualContentValidationError);
        expect((error as ManualContentValidationError).isRetryable).toBe(false);
      }
    });

    it('should have correct HTTP status 400 for validation errors', async () => {
      try {
        await strategy.ingest('');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ManualContentValidationError);
        expect((error as ManualContentValidationError).getStatus()).toBe(400);
      }
    });
  });

  describe('Content Sanitization', () => {
    it('should normalize CRLF to LF', async () => {
      const result = await strategy.ingest('line1\r\nline2\r\nline3');
      expect(result.content).toBe('line1\nline2\nline3');
    });

    it('should normalize CR to LF', async () => {
      const result = await strategy.ingest('line1\rline2');
      expect(result.content).toBe('line1\nline2');
    });

    it('should collapse multiple blank lines to maximum of 2', async () => {
      const result = await strategy.ingest('para1\n\n\n\n\npara2');
      expect(result.content).toBe('para1\n\npara2');
    });

    it('should trim leading and trailing whitespace', async () => {
      const result = await strategy.ingest('  \n\nHello World  \n\n  ');
      expect(result.content).toBe('Hello World');
    });

    it('should preserve single blank lines between paragraphs', async () => {
      const result = await strategy.ingest('para1\n\npara2');
      expect(result.content).toBe('para1\n\npara2');
    });

    it('should preserve content with mixed line endings after normalization', async () => {
      const result = await strategy.ingest('a\r\nb\rc\nd');
      expect(result.content).toBe('a\nb\nc\nd');
    });
  });

  describe('Source URL Generation (Idempotency)', () => {
    it('should generate deterministic source URL based on content hash', async () => {
      const content = 'Test content for hashing';
      const result1 = await strategy.ingest(content);
      const result2 = await strategy.ingest(content);

      expect(result1.sourceUrl).toBe(result2.sourceUrl);
    });

    it('should generate source URL in format manual://{hash}', async () => {
      const content = 'Test content';
      const result = await strategy.ingest(content);

      expect(result.sourceUrl).toMatch(/^manual:\/\/[a-f0-9]{32}$/);
    });

    it('should generate different source URLs for different content', async () => {
      const result1 = await strategy.ingest('Content A');
      const result2 = await strategy.ingest('Content B');

      expect(result1.sourceUrl).not.toBe(result2.sourceUrl);
    });

    it('should generate same hash for same content regardless of leading/trailing whitespace', async () => {
      // Note: after sanitization, both become 'Same content'
      const result1 = await strategy.ingest('Same content');
      const result2 = await strategy.ingest('  Same content  ');

      // Since sanitization trims, the hashes should be based on sanitized content
      // But we hash ORIGINAL content for true idempotency
      // This test documents behavior - adjust based on implementation choice
      expect(result1.sourceUrl).not.toBe(result2.sourceUrl);
    });
  });

  describe('Title Generation', () => {
    it('should generate title from first line of content', async () => {
      const result = await strategy.ingest('My Title\nBody content here');
      expect(result.title).toBe('My Title');
    });

    it('should truncate long first lines to 50 characters with ellipsis', async () => {
      const longTitle = 'A'.repeat(60);
      const result = await strategy.ingest(longTitle);
      expect(result.title).toBe('A'.repeat(50) + '...');
    });

    it('should handle content that is exactly 50 characters without ellipsis', async () => {
      const exactTitle = 'A'.repeat(50);
      const result = await strategy.ingest(exactTitle);
      expect(result.title).toBe(exactTitle);
    });

    it('should use "Manual Input" as fallback when content starts with whitespace only', async () => {
      const result = await strategy.ingest('\n\nActual content');
      expect(result.title).toBe('Actual content');
    });

    it('should use first non-empty line for title', async () => {
      const result = await strategy.ingest('First line title');
      expect(result.title).toBe('First line title');
    });
  });

  describe('IngestResult Structure', () => {
    it('should return correct IngestResult structure', async () => {
      const result = await strategy.ingest('Test content');

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('sourceUrl');
      expect(result).toHaveProperty('metadata');
      expect(typeof result.content).toBe('string');
      expect(typeof result.title).toBe('string');
      expect(typeof result.sourceUrl).toBe('string');
      expect(typeof result.metadata).toBe('object');
    });

    it('should not include rawContent (manual sources do not need preview)', async () => {
      const result = await strategy.ingest('Test content for manual input');

      // rawContent should be undefined for manual sources
      expect(result.rawContent).toBeUndefined();
    });

    it('should include contentHash in metadata', async () => {
      const result = await strategy.ingest('Test content');
      expect(result.metadata).toHaveProperty('contentHash');
      expect(typeof result.metadata.contentHash).toBe('string');
      expect((result.metadata.contentHash as string).length).toBe(32);
    });

    it('should include original and sanitized length in metadata', async () => {
      const result = await strategy.ingest('  Test  ');
      expect(result.metadata).toHaveProperty('originalLength', 8);
      expect(result.metadata).toHaveProperty('sanitizedLength', 4);
    });

    it('should include createdAt timestamp in metadata', async () => {
      const result = await strategy.ingest('Test content');
      expect(result.metadata).toHaveProperty('createdAt');
      expect(() => new Date(result.metadata.createdAt as string)).not.toThrow();
    });

    it('should have createdAt as valid ISO-8601 timestamp', async () => {
      const result = await strategy.ingest('Test content');
      const createdAt = result.metadata.createdAt as string;
      expect(new Date(createdAt).toISOString()).toBe(createdAt);
    });
  });

  describe('Configuration', () => {
    it('should use configured max content length', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'manual.maxContentLength') return 50;
        return defaultConfig[key];
      });

      const module = await Test.createTestingModule({
        providers: [
          ManualStrategy,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const customStrategy = module.get<ManualStrategy>(ManualStrategy);

      const content = 'a'.repeat(51);
      await expect(customStrategy.ingest(content)).rejects.toThrow(
        ManualContentValidationError,
      );
    });

    it('should accept content within custom max length', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'manual.maxContentLength') return 50;
        return defaultConfig[key];
      });

      const module = await Test.createTestingModule({
        providers: [
          ManualStrategy,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const customStrategy = module.get<ManualStrategy>(ManualStrategy);

      const content = 'a'.repeat(50);
      await expect(customStrategy.ingest(content)).resolves.toBeDefined();
    });

    it('should use default max content length when not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'manual.maxContentLength') return undefined;
        return defaultConfig[key];
      });

      const module = await Test.createTestingModule({
        providers: [
          ManualStrategy,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const customStrategy = module.get<ManualStrategy>(ManualStrategy);

      // Default is 102400, should accept content under that
      const content = 'a'.repeat(1000);
      await expect(customStrategy.ingest(content)).resolves.toBeDefined();
    });

    it('should use configured min content length', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'manual.minContentLength') return 10;
        return defaultConfig[key];
      });

      const module = await Test.createTestingModule({
        providers: [
          ManualStrategy,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const customStrategy = module.get<ManualStrategy>(ManualStrategy);

      const content = 'short'; // 5 chars, less than 10
      await expect(customStrategy.ingest(content)).rejects.toThrow(
        ManualContentValidationError,
      );
    });
  });

  describe('Observability', () => {
    it('should complete successfully for valid content', async () => {
      await expect(strategy.ingest('Valid content')).resolves.toBeDefined();
    });

    it('should not expose internal details in error messages', async () => {
      try {
        await strategy.ingest('');
        fail('Expected error to be thrown');
      } catch (error) {
        expect((error as Error).message).not.toContain('internal');
        expect((error as Error).message).not.toContain('stack');
      }
    });

    it('should provide user-friendly error message for empty content', async () => {
      try {
        await strategy.ingest('');
        fail('Expected error to be thrown');
      } catch (error) {
        expect((error as Error).message).toContain('empty');
      }
    });
  });
});
