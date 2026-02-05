import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  UrlValidationError,
  FetchError,
  ContentExtractionError,
} from '@ingest/strategies/errors/web-ingest.errors';

// Mock jsdom and Readability before importing WebStrategy
jest.mock('jsdom', () => ({
  JSDOM: jest.fn().mockImplementation((html: string) => ({
    window: {
      document: { html },
    },
  })),
}));

jest.mock('@mozilla/readability', () => ({
  Readability: jest.fn().mockImplementation(() => ({
    parse: jest.fn(),
  })),
}));

// Import after mocks are set up
import { WebStrategy } from '@ingest/strategies/web.strategy';
import { Readability } from '@mozilla/readability';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('WebStrategy', () => {
  let strategy: WebStrategy;
  let mockConfigService: jest.Mocked<ConfigService>;

  const defaultConfig: Record<string, unknown> = {
    'web.fetchTimeout': 30000,
    'web.userAgent': 'KMS-RAG Bot/1.0',
    'web.maxContentLength': 10485760,
  };

  const mockArticle = {
    title: 'Test Article',
    textContent: 'This is the main article content that should be extracted.',
    excerpt: 'Test excerpt',
    byline: 'Test Author',
    siteName: 'Test Site',
    lang: 'en',
    publishedTime: null,
    length: 100,
  };

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => defaultConfig[key]),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebStrategy,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<WebStrategy>(WebStrategy);

    // Reset mocks
    jest.clearAllMocks();

    // Default mock for Readability.parse()
    (Readability as jest.Mock).mockImplementation(() => ({
      parse: jest.fn().mockReturnValue(mockArticle),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should have sourceType "web"', () => {
    expect(strategy.sourceType).toBe('web');
  });

  describe('URL Validation', () => {
    it('should reject invalid URL format', async () => {
      await expect(strategy.ingest('not-a-url')).rejects.toThrow(
        UrlValidationError,
      );
    });

    it('should reject non-http schemes (ftp://)', async () => {
      await expect(strategy.ingest('ftp://example.com')).rejects.toThrow(
        UrlValidationError,
      );
    });

    it('should reject file:// scheme', async () => {
      await expect(strategy.ingest('file:///etc/passwd')).rejects.toThrow(
        UrlValidationError,
      );
    });

    it('should reject javascript: scheme', async () => {
      await expect(strategy.ingest('javascript:alert(1)')).rejects.toThrow(
        UrlValidationError,
      );
    });

    it('should reject localhost URLs', async () => {
      await expect(strategy.ingest('http://localhost/admin')).rejects.toThrow(
        UrlValidationError,
      );
    });

    it('should reject 127.0.0.1 URLs', async () => {
      await expect(strategy.ingest('http://127.0.0.1/admin')).rejects.toThrow(
        UrlValidationError,
      );
    });

    it('should reject private IP 10.x.x.x', async () => {
      await expect(
        strategy.ingest('http://10.0.0.1/internal'),
      ).rejects.toThrow(UrlValidationError);
    });

    it('should reject private IP 192.168.x.x', async () => {
      await expect(
        strategy.ingest('http://192.168.1.1/router'),
      ).rejects.toThrow(UrlValidationError);
    });

    it('should reject private IP 172.16.x.x', async () => {
      await expect(
        strategy.ingest('http://172.16.0.1/internal'),
      ).rejects.toThrow(UrlValidationError);
    });
  });

  describe('HTTP Fetching', () => {
    const validHtml = '<html><head><title>Test</title></head><body><p>Content</p></body></html>';

    it('should fetch content from valid https URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve(validHtml),
      });

      const result = await strategy.ingest('https://example.com/article');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/article',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'KMS-RAG Bot/1.0',
          }),
        }),
      );
      expect(result.content).toBeTruthy();
      expect(result.sourceUrl).toBe('https://example.com/article');
    });

    it('should fetch content from valid http URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve(validHtml),
      });

      const result = await strategy.ingest('http://example.com/article');

      expect(result.content).toBeTruthy();
    });

    it('should include configured User-Agent header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve(validHtml),
      });

      await strategy.ingest('https://example.com/article');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'KMS-RAG Bot/1.0',
          }),
        }),
      );
    });

    it('should handle HTTP 404 errors (non-retryable)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
      });

      try {
        await strategy.ingest('https://example.com/missing');
        fail('Expected FetchError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FetchError);
        expect((error as FetchError).isRetryable).toBe(false);
      }
    });

    it('should handle HTTP 500 errors (retryable)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
      });

      try {
        await strategy.ingest('https://example.com/error');
        fail('Expected FetchError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FetchError);
        expect((error as FetchError).isRetryable).toBe(true);
      }
    });

    it('should handle HTTP 503 errors (retryable)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers(),
      });

      try {
        await strategy.ingest('https://example.com/unavailable');
        fail('Expected FetchError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FetchError);
        expect((error as FetchError).isRetryable).toBe(true);
      }
    });

    it('should reject non-HTML content types', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve('{"data": "json"}'),
      });

      await expect(
        strategy.ingest('https://example.com/api/data'),
      ).rejects.toThrow(FetchError);
    });

    it('should accept text/html content type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
        text: () => Promise.resolve(validHtml),
      });

      const result = await strategy.ingest('https://example.com/article');
      expect(result.content).toBeTruthy();
    });

    it('should accept application/xhtml+xml content type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/xhtml+xml' }),
        text: () => Promise.resolve(validHtml),
      });

      const result = await strategy.ingest('https://example.com/article');
      expect(result.content).toBeTruthy();
    });

    it('should reject content exceeding max size via Content-Length header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'text/html',
          'content-length': '20000000', // 20MB > 10MB limit
        }),
        text: () => Promise.resolve(validHtml),
      });

      await expect(
        strategy.ingest('https://example.com/large'),
      ).rejects.toThrow(FetchError);
    });

    it('should handle network errors (retryable)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await strategy.ingest('https://example.com/article');
        fail('Expected FetchError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FetchError);
        expect((error as FetchError).isRetryable).toBe(true);
      }
    });

    it('should handle timeout errors (retryable)', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      try {
        await strategy.ingest('https://example.com/slow');
        fail('Expected FetchError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FetchError);
        expect((error as FetchError).isRetryable).toBe(true);
      }
    });
  });

  describe('Content Extraction', () => {
    const validHtml = '<html><head><title>Test</title></head><body><p>Content</p></body></html>';

    it('should extract title from HTML', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve(validHtml),
      });

      (Readability as jest.Mock).mockImplementation(() => ({
        parse: jest.fn().mockReturnValue({
          ...mockArticle,
          title: 'My Article Title',
        }),
      }));

      const result = await strategy.ingest('https://example.com/article');
      expect(result.title).toBe('My Article Title');
    });

    it('should extract main content using Readability', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve(validHtml),
      });

      const result = await strategy.ingest('https://example.com/article');
      expect(result.content).toContain('main article content');
    });

    it('should handle pages without clear article content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve(validHtml),
      });

      (Readability as jest.Mock).mockImplementation(() => ({
        parse: jest.fn().mockReturnValue(null),
      }));

      await expect(
        strategy.ingest('https://example.com/empty'),
      ).rejects.toThrow(ContentExtractionError);
    });

    it('should use hostname as fallback title when title is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve(validHtml),
      });

      (Readability as jest.Mock).mockImplementation(() => ({
        parse: jest.fn().mockReturnValue({
          ...mockArticle,
          title: '',
        }),
      }));

      const result = await strategy.ingest('https://example.com/notitle');
      expect(result.title).toBe('example.com');
    });

    it('should throw ContentExtractionError when textContent is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve(validHtml),
      });

      (Readability as jest.Mock).mockImplementation(() => ({
        parse: jest.fn().mockReturnValue({
          ...mockArticle,
          textContent: '   ',
        }),
      }));

      await expect(
        strategy.ingest('https://example.com/empty-content'),
      ).rejects.toThrow(ContentExtractionError);
    });
  });

  describe('Raw Content Capture', () => {
    const validHtml = '<html><head><title>Test</title></head><body><article><p>Content</p></article></body></html>';

    it('should include rawContent in IngestResult', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve(validHtml),
      });

      const result = await strategy.ingest('https://example.com/article');

      expect(result).toHaveProperty('rawContent');
      expect(result.rawContent).toBe(validHtml);
    });

    it('should preserve full rawContent as-is', async () => {
      const largeHtml = '<html><body>' + 'x'.repeat(2000000) + '</body></html>'; // 2MB+
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve(largeHtml),
      });

      const result = await strategy.ingest('https://example.com/large');

      expect(result.rawContent).toBe(largeHtml);
    });
  });

  describe('IngestResult', () => {
    const validHtml = '<html><head><title>Test</title></head><body><p>Content</p></body></html>';

    it('should return correct IngestResult structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve(validHtml),
      });

      const result = await strategy.ingest('https://example.com/article');

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('sourceUrl');
      expect(result).toHaveProperty('metadata');
      expect(typeof result.content).toBe('string');
      expect(typeof result.title).toBe('string');
      expect(typeof result.sourceUrl).toBe('string');
      expect(typeof result.metadata).toBe('object');
    });

    it('should preserve original URL in sourceUrl', async () => {
      const testUrl = 'https://example.com/my-article?param=value';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve(validHtml),
      });

      const result = await strategy.ingest(testUrl);
      expect(result.sourceUrl).toBe(testUrl);
    });

    it('should include metadata from extraction', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve(validHtml),
      });

      const result = await strategy.ingest('https://example.com/article');

      expect(result.metadata).toBeDefined();
      expect(result.metadata).toHaveProperty('excerpt');
      expect(result.metadata).toHaveProperty('byline');
      expect(result.metadata).toHaveProperty('siteName');
      expect(result.metadata).toHaveProperty('lang');
      expect(result.metadata).toHaveProperty('length');
    });
  });
});
