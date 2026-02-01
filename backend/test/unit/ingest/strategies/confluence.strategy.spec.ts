import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConfluenceStrategy } from '@ingest/strategies/confluence.strategy';
import {
  ConfluenceConfigError,
  ConfluenceAuthError,
  ConfluenceNotFoundError,
  ConfluenceRateLimitError,
  ConfluenceFetchError,
  ConfluenceContentExtractionError,
  ConfluenceUrlValidationError,
} from '@ingest/strategies/errors/confluence-ingest.errors';

// Mock jsdom
jest.mock('jsdom', () => ({
  JSDOM: jest.fn().mockImplementation((html: string) => ({
    window: {
      document: {
        body: {
          textContent: html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        },
      },
    },
  })),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('ConfluenceStrategy', () => {
  let strategy: ConfluenceStrategy;
  let mockConfigService: jest.Mocked<ConfigService>;

  const defaultConfig: Record<string, unknown> = {
    'confluence.baseUrl': 'https://test.atlassian.net',
    'confluence.userEmail': 'test@example.com',
    'confluence.apiToken': 'test-api-token',
    'confluence.fetchTimeout': 30000,
  };

  const mockPageResponse = {
    id: '123456',
    status: 'current',
    title: 'Test Page Title',
    spaceId: '789',
    body: {
      storage: {
        value: '<p>This is the page content.</p><p>Second paragraph.</p>',
        representation: 'storage',
      },
    },
    _links: {
      webui: '/wiki/spaces/SPACE/pages/123456/Test+Page+Title',
      base: 'https://test.atlassian.net',
    },
  };

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => defaultConfig[key]),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfluenceStrategy,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<ConfluenceStrategy>(ConfluenceStrategy);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should have sourceType "confluence"', () => {
    expect(strategy.sourceType).toBe('confluence');
  });

  describe('Configuration', () => {
    it('should throw ConfluenceConfigError when baseUrl is not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'confluence.baseUrl') return undefined;
        return defaultConfig[key];
      });

      // Re-create strategy with new config
      const module = await Test.createTestingModule({
        providers: [
          ConfluenceStrategy,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const strategyWithoutBaseUrl = module.get<ConfluenceStrategy>(ConfluenceStrategy);

      await expect(strategyWithoutBaseUrl.ingest('123456')).rejects.toThrow(
        ConfluenceConfigError,
      );
      await expect(strategyWithoutBaseUrl.ingest('123456')).rejects.toThrow(
        'Confluence base URL not configured',
      );
    });

    it('should throw ConfluenceConfigError when apiToken is missing', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'confluence.apiToken') return undefined;
        return defaultConfig[key];
      });

      const module = await Test.createTestingModule({
        providers: [
          ConfluenceStrategy,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const strategyWithoutToken = module.get<ConfluenceStrategy>(ConfluenceStrategy);

      await expect(strategyWithoutToken.ingest('123456')).rejects.toThrow(
        ConfluenceConfigError,
      );
      await expect(strategyWithoutToken.ingest('123456')).rejects.toThrow(
        'Confluence credentials not configured',
      );
    });

    it('should throw ConfluenceConfigError when userEmail is missing', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'confluence.userEmail') return undefined;
        return defaultConfig[key];
      });

      const module = await Test.createTestingModule({
        providers: [
          ConfluenceStrategy,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const strategyWithoutEmail = module.get<ConfluenceStrategy>(ConfluenceStrategy);

      await expect(strategyWithoutEmail.ingest('123456')).rejects.toThrow(
        ConfluenceConfigError,
      );
    });

    it('should use default timeout when not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'confluence.fetchTimeout') return undefined;
        return defaultConfig[key];
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPageResponse),
      });

      const module = await Test.createTestingModule({
        providers: [
          ConfluenceStrategy,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const strategyWithDefaultTimeout = module.get<ConfluenceStrategy>(ConfluenceStrategy);

      // Should not throw due to timeout config
      await expect(strategyWithDefaultTimeout.ingest('123456')).resolves.toBeDefined();
    });
  });

  describe('Input Parsing', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPageResponse),
      });
    });

    it('should accept numeric page ID directly', async () => {
      const result = await strategy.ingest('123456');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.atlassian.net/wiki/api/v2/pages/123456?body-format=storage',
        expect.any(Object),
      );
      expect(result.content).toBeTruthy();
    });

    it('should extract page ID from valid Confluence URL', async () => {
      await strategy.ingest(
        'https://test.atlassian.net/wiki/spaces/SPACE/pages/789012/My-Page',
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.atlassian.net/wiki/api/v2/pages/789012?body-format=storage',
        expect.any(Object),
      );
    });

    it('should reject invalid URL format', async () => {
      await expect(strategy.ingest('not-a-valid-url-or-id')).rejects.toThrow(
        ConfluenceUrlValidationError,
      );
    });

    it('should reject non-Atlassian domains', async () => {
      await expect(
        strategy.ingest('https://example.com/wiki/spaces/SPACE/pages/123/Title'),
      ).rejects.toThrow(ConfluenceUrlValidationError);
    });

    it('should accept configured base URL domain', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'confluence.baseUrl') return 'https://custom.confluence.local';
        return defaultConfig[key];
      });

      const module = await Test.createTestingModule({
        providers: [
          ConfluenceStrategy,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const strategyWithCustomUrl = module.get<ConfluenceStrategy>(ConfluenceStrategy);

      await expect(
        strategyWithCustomUrl.ingest(
          'https://custom.confluence.local/wiki/spaces/SPACE/pages/123/Title',
        ),
      ).resolves.toBeDefined();
    });

    it('should reject URL without page ID pattern', async () => {
      await expect(
        strategy.ingest('https://test.atlassian.net/wiki/spaces/SPACE/overview'),
      ).rejects.toThrow(ConfluenceUrlValidationError);
    });
  });

  describe('Authentication', () => {
    it('should build correct Basic Auth header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPageResponse),
      });

      await strategy.ingest('123456');

      const expectedAuth = Buffer.from('test@example.com:test-api-token').toString('base64');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Basic ${expectedAuth}`,
          }),
        }),
      );
    });

    it('should handle 401 Unauthorized (non-retryable)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
      });

      try {
        await strategy.ingest('123456');
        fail('Expected ConfluenceAuthError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfluenceAuthError);
        expect((error as ConfluenceAuthError).isRetryable).toBe(false);
      }
    });

    it('should handle 403 Forbidden (non-retryable)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Headers(),
      });

      try {
        await strategy.ingest('123456');
        fail('Expected ConfluenceAuthError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfluenceAuthError);
        expect((error as ConfluenceAuthError).isRetryable).toBe(false);
      }
    });
  });

  describe('HTTP Fetching', () => {
    it('should fetch page content successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPageResponse),
      });

      const result = await strategy.ingest('123456');

      expect(result.content).toContain('This is the page content');
      expect(result.title).toBe('Test Page Title');
      expect(result.sourceUrl).toBe(
        'https://test.atlassian.net/wiki/spaces/SPACE/pages/123456/Test+Page+Title',
      );
    });

    it('should handle 404 Not Found (non-retryable)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
      });

      try {
        await strategy.ingest('999999');
        fail('Expected ConfluenceNotFoundError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfluenceNotFoundError);
        expect((error as ConfluenceNotFoundError).isRetryable).toBe(false);
        expect(error.message).toContain('999999');
      }
    });

    it('should handle 429 Rate Limit with Retry-After (retryable)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({ 'Retry-After': '60' }),
      });

      try {
        await strategy.ingest('123456');
        fail('Expected ConfluenceRateLimitError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfluenceRateLimitError);
        expect((error as ConfluenceRateLimitError).isRetryable).toBe(true);
        expect(error.message).toContain('60');
      }
    });

    it('should handle 500 Server Error (retryable)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
      });

      try {
        await strategy.ingest('123456');
        fail('Expected ConfluenceFetchError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfluenceFetchError);
        expect((error as ConfluenceFetchError).isRetryable).toBe(true);
      }
    });

    it('should handle timeout (retryable)', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      try {
        await strategy.ingest('123456');
        fail('Expected ConfluenceFetchError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfluenceFetchError);
        expect((error as ConfluenceFetchError).isRetryable).toBe(true);
        expect(error.message).toContain('timeout');
      }
    });

    it('should handle network errors (retryable)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await strategy.ingest('123456');
        fail('Expected ConfluenceFetchError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfluenceFetchError);
        expect((error as ConfluenceFetchError).isRetryable).toBe(true);
      }
    });
  });

  describe('Content Extraction', () => {
    it('should extract text from storage format HTML', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ...mockPageResponse,
            body: {
              storage: {
                value: '<p>First paragraph.</p><p>Second paragraph with <strong>bold</strong> text.</p>',
                representation: 'storage',
              },
            },
          }),
      });

      const result = await strategy.ingest('123456');

      expect(result.content).toContain('First paragraph');
      expect(result.content).toContain('Second paragraph');
    });

    it('should remove Confluence macros (ac:* tags)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ...mockPageResponse,
            body: {
              storage: {
                value: '<p>Content</p><ac:structured-macro ac:name="toc"><ac:parameter ac:name="maxLevel">2</ac:parameter></ac:structured-macro><p>More content</p>',
                representation: 'storage',
              },
            },
          }),
      });

      const result = await strategy.ingest('123456');

      expect(result.content).not.toContain('ac:');
      expect(result.content).toContain('Content');
      expect(result.content).toContain('More content');
    });

    it('should remove resource identifiers (ri:* tags)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ...mockPageResponse,
            body: {
              storage: {
                value: '<p>See <ri:page ri:content-title="Other Page"/></p>',
                representation: 'storage',
              },
            },
          }),
      });

      const result = await strategy.ingest('123456');

      expect(result.content).not.toContain('ri:');
    });

    it('should throw ContentExtractionError for empty content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ...mockPageResponse,
            body: {
              storage: {
                value: '   ',
                representation: 'storage',
              },
            },
          }),
      });

      await expect(strategy.ingest('123456')).rejects.toThrow(
        ConfluenceContentExtractionError,
      );
    });
  });

  describe('IngestResult', () => {
    it('should return correct IngestResult structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPageResponse),
      });

      const result = await strategy.ingest('123456');

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('sourceUrl');
      expect(result).toHaveProperty('metadata');
      expect(typeof result.content).toBe('string');
      expect(typeof result.title).toBe('string');
      expect(typeof result.sourceUrl).toBe('string');
      expect(typeof result.metadata).toBe('object');
    });

    it('should include pageId in metadata', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPageResponse),
      });

      const result = await strategy.ingest('123456');

      expect(result.metadata).toHaveProperty('pageId', '123456');
    });

    it('should include spaceId in metadata', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPageResponse),
      });

      const result = await strategy.ingest('123456');

      expect(result.metadata).toHaveProperty('spaceId', '789');
    });

    it('should build correct webui URL from response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPageResponse),
      });

      const result = await strategy.ingest('123456');

      expect(result.sourceUrl).toBe(
        'https://test.atlassian.net/wiki/spaces/SPACE/pages/123456/Test+Page+Title',
      );
    });
  });

  describe('Observability', () => {
    // Note: We can't easily test logging without mocking the logger
    // These tests verify the strategy doesn't crash on various paths

    it('should complete successfully and log events', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPageResponse),
      });

      // Should not throw
      await expect(strategy.ingest('123456')).resolves.toBeDefined();
    });

    it('should handle failure path without exposing sensitive data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
      });

      try {
        await strategy.ingest('123456');
      } catch (error) {
        // Error message should not contain the API token
        expect(error.message).not.toContain('test-api-token');
      }
    });
  });
});
