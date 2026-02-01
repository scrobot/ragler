import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { IngestStrategy, IngestResult } from './ingest.strategy';
import { SourceType } from '@ingest/dto';
import { validateUrl, validateHostname } from './utils/url-validator';
import {
  FetchError,
  ContentExtractionError,
} from './errors/web-ingest.errors';

@Injectable()
export class WebStrategy implements IngestStrategy {
  readonly sourceType: SourceType = 'web';
  private readonly logger = new Logger(WebStrategy.name);

  private readonly timeout: number;
  private readonly userAgent: string;
  private readonly maxContentLength: number;

  constructor(private readonly configService: ConfigService) {
    this.timeout = this.configService.get<number>('web.fetchTimeout') ?? 30000;
    this.userAgent =
      this.configService.get<string>('web.userAgent') ?? 'KMS-RAG Bot/1.0';
    this.maxContentLength =
      this.configService.get<number>('web.maxContentLength') ?? 10485760;
  }

  async ingest(urlString: string): Promise<IngestResult> {
    const startTime = Date.now();
    this.logger.log({
      event: 'ingest_start',
      url: urlString,
      sourceType: this.sourceType,
    });

    try {
      // 1. Validate URL format and scheme
      const url = validateUrl(urlString);

      // 2. Validate hostname (SSRF prevention)
      validateHostname(url.hostname);

      // 3. Fetch content
      const html = await this.fetchContent(url.toString());

      // 4. Extract content using Readability
      const extracted = this.extractContent(html, url.toString());

      const duration = Date.now() - startTime;
      this.logger.log({
        event: 'ingest_success',
        url: urlString,
        sourceType: this.sourceType,
        durationMs: duration,
        contentLength: extracted.content.length,
      });

      return extracted;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error({
        event: 'ingest_failure',
        url: urlString,
        sourceType: this.sourceType,
        durationMs: duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        isRetryable: error instanceof FetchError ? error.isRetryable : false,
      });
      throw error;
    }
  }

  private async fetchContent(url: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const isRetryable = response.status >= 500 || response.status === 429;
        throw new FetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          isRetryable,
        );
      }

      // Validate content type
      const contentType = response.headers.get('content-type') ?? '';
      if (
        !contentType.includes('text/html') &&
        !contentType.includes('application/xhtml+xml')
      ) {
        throw new FetchError(
          `Invalid content type: ${contentType}. Expected text/html.`,
          false,
        );
      }

      // Check content length if provided
      const contentLength = response.headers.get('content-length');
      if (
        contentLength &&
        parseInt(contentLength, 10) > this.maxContentLength
      ) {
        throw new FetchError(
          `Content too large: ${contentLength} bytes exceeds ${this.maxContentLength} limit`,
          false,
        );
      }

      return await response.text();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof FetchError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new FetchError(
            `Request timeout after ${this.timeout}ms`,
            true,
            error,
          );
        }
        throw new FetchError(`Network error: ${error.message}`, true, error);
      }

      throw new FetchError('Unknown fetch error', true);
    }
  }

  private extractContent(html: string, url: string): IngestResult {
    try {
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article || !article.textContent?.trim()) {
        throw new ContentExtractionError(
          'Failed to extract meaningful content from the page',
        );
      }

      return {
        content: article.textContent.trim(),
        title: article.title || new URL(url).hostname,
        sourceUrl: url,
        metadata: {
          excerpt: article.excerpt ?? null,
          byline: article.byline ?? null,
          siteName: article.siteName ?? null,
          lang: article.lang ?? null,
          publishedTime: article.publishedTime ?? null,
          length: article.length,
        },
      };
    } catch (error) {
      if (error instanceof ContentExtractionError) {
        throw error;
      }
      throw new ContentExtractionError(
        `Failed to parse HTML: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
