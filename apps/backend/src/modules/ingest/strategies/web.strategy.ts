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
        rawContentLength: html.length,
      });

      return {
        ...extracted,
        rawContent: html,
      };
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
      const document = dom.window.document;

      // Pre-clean: remove elements that pollute text extraction
      const elementsToRemove = document.querySelectorAll(
        'script, style, noscript, iframe, svg, nav, footer, header, aside, ' +
        'form, button, input, select, textarea, [role="navigation"], ' +
        '[role="banner"], [role="contentinfo"], .nav, .navbar, .footer, ' +
        '.sidebar, .menu, .ad, .advertisement, .cookie-banner',
      );
      elementsToRemove.forEach((el) => el.remove());

      // Try Readability first
      const reader = new Readability(document);
      const article = reader.parse();

      let text: string;
      let title: string;
      let metadata: Record<string, unknown> = {};

      if (article && article.textContent?.trim()) {
        text = article.textContent;
        title = article.title || new URL(url).hostname;
        metadata = {
          excerpt: article.excerpt ?? null,
          byline: article.byline ?? null,
          siteName: article.siteName ?? null,
          lang: article.lang ?? null,
          publishedTime: article.publishedTime ?? null,
          length: article.length,
        };
      } else {
        // Fallback: extract from body directly
        const body = new JSDOM(html, { url }).window.document.body;
        if (body) {
          // Remove the same noise elements
          body.querySelectorAll('script, style, noscript, iframe, svg, nav, footer, header').forEach((el) => el.remove());
          text = body.textContent ?? '';
        } else {
          text = '';
        }
        title = new JSDOM(html, { url }).window.document.title || new URL(url).hostname;
      }

      // Post-process: clean text
      text = this.cleanExtractedText(text);

      if (!text) {
        throw new ContentExtractionError(
          'Failed to extract meaningful content from the page',
        );
      }

      return {
        content: text,
        title,
        sourceUrl: url,
        metadata,
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

  /**
   * Clean extracted text: normalize whitespace, strip residual HTML entities,
   * remove excessive blank lines, and trim.
   */
  private cleanExtractedText(text: string): string {
    return text
      // Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      // Strip any remaining HTML tags (safety net)
      .replace(/<[^>]*>/g, '')
      // Normalize whitespace within lines
      .replace(/[ \t]+/g, ' ')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Collapse 3+ newlines into 2
      .replace(/\n{3,}/g, '\n\n')
      // Trim each line
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      // Final trim
      .trim();
  }

}
