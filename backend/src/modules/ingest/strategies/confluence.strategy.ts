import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JSDOM } from 'jsdom';
import { IngestStrategy, IngestResult } from './ingest.strategy';
import { SourceType } from '@ingest/dto';
import {
  validateConfluenceUrl,
  extractPageIdFromUrl,
  isValidPageId,
} from './utils/confluence-url-validator';
import {
  ConfluenceAuthError,
  ConfluenceConfigError,
  ConfluenceContentExtractionError,
  ConfluenceFetchError,
  ConfluenceNotFoundError,
  ConfluenceRateLimitError,
} from './errors/confluence-ingest.errors';

/**
 * Response structure from Confluence REST API v2 pages endpoint.
 */
interface ConfluencePageResponse {
  id: string;
  status: string;
  title: string;
  spaceId: string;
  body: {
    storage: {
      value: string;
      representation: string;
    };
  };
  _links: {
    webui: string;
    base: string;
  };
}

@Injectable()
export class ConfluenceStrategy implements IngestStrategy {
  readonly sourceType: SourceType = 'confluence';
  private readonly logger = new Logger(ConfluenceStrategy.name);

  private readonly baseUrl: string | undefined;
  private readonly apiToken: string | undefined;
  private readonly userEmail: string | undefined;
  private readonly timeout: number;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('confluence.baseUrl');
    this.apiToken = this.configService.get<string>('confluence.apiToken');
    this.userEmail = this.configService.get<string>('confluence.userEmail');
    this.timeout =
      this.configService.get<number>('confluence.fetchTimeout') ?? 30000;
  }

  /**
   * Ingests content from a Confluence page.
   *
   * @param input - Either a numeric page ID or a full Confluence URL
   * @returns IngestResult with extracted content and metadata
   */
  async ingest(input: string): Promise<IngestResult> {
    const startTime = Date.now();

    // Parse input to determine page ID and source URL
    const { pageId, sourceUrl, effectiveBaseUrl } = this.parseInput(input);

    this.logger.log({
      event: 'confluence_ingest_start',
      pageId,
      sourceUrl,
      sourceType: this.sourceType,
    });

    try {
      // Validate configuration
      this.validateConfiguration();

      // Use effective base URL from input URL, or fall back to configured base URL
      const baseUrlToUse = effectiveBaseUrl ?? this.baseUrl!;

      // Fetch page from Confluence API v2
      const page = await this.fetchPage(pageId, baseUrlToUse);

      // Preserve raw storage format for preview
      const rawContent = page.body.storage.value;

      // Extract text content from storage format
      const content = this.extractContent(rawContent);

      // Build the web UI URL
      const webUrl = this.buildWebUrl(page);

      const duration = Date.now() - startTime;
      this.logger.log({
        event: 'confluence_ingest_success',
        pageId,
        sourceUrl: webUrl,
        sourceType: this.sourceType,
        durationMs: duration,
        contentLength: content.length,
        rawContentLength: rawContent.length,
        pageTitle: page.title,
      });

      return {
        content,
        title: page.title,
        sourceUrl: webUrl,
        metadata: {
          pageId: page.id,
          spaceId: page.spaceId,
          status: page.status,
          confluenceBaseUrl: this.baseUrl,
        },
        rawContent,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error({
        event: 'confluence_ingest_failure',
        pageId,
        sourceUrl,
        sourceType: this.sourceType,
        durationMs: duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        isRetryable:
          error instanceof ConfluenceFetchError ||
            error instanceof ConfluenceRateLimitError
            ? (error as ConfluenceFetchError).isRetryable
            : false,
      });
      throw error;
    }
  }

  /**
   * Parses the input to extract page ID, source URL, and effective base URL.
   * Input can be either a numeric page ID or a Confluence URL.
   */
  private parseInput(input: string): {
    pageId: string;
    sourceUrl: string;
    effectiveBaseUrl: string | undefined;
  } {
    // Check if input is a numeric page ID
    if (isValidPageId(input)) {
      return {
        pageId: input,
        sourceUrl: `confluence://page/${input}`,
        effectiveBaseUrl: undefined,
      };
    }

    // Otherwise, treat as URL and extract page ID
    const url = validateConfluenceUrl(input, this.baseUrl);
    const pageId = extractPageIdFromUrl(url);
    return {
      pageId,
      sourceUrl: input,
      effectiveBaseUrl: url.origin,
    };
  }

  /**
   * Validates that required Confluence configuration is present.
   */
  private validateConfiguration(): void {
    if (!this.baseUrl) {
      throw new ConfluenceConfigError(
        'Confluence base URL not configured. Set CONFLUENCE_BASE_URL environment variable.',
      );
    }
    if (!this.apiToken || !this.userEmail) {
      throw new ConfluenceConfigError(
        'Confluence credentials not configured. Set CONFLUENCE_API_TOKEN and CONFLUENCE_USER_EMAIL.',
      );
    }
  }

  /**
   * Fetches page content from Confluence REST API v2.
   *
   * @param pageId - The Confluence page ID
   * @param effectiveBaseUrl - Base URL to use (from URL input or configured)
   */
  private async fetchPage(
    pageId: string,
    effectiveBaseUrl: string,
  ): Promise<ConfluencePageResponse> {
    const url = `${effectiveBaseUrl}/wiki/api/v2/pages/${pageId}?body-format=storage`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Authorization: this.buildAuthHeader(),
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.handleHttpError(response, pageId);
      }

      return (await response.json()) as ConfluencePageResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      // Re-throw known Confluence errors
      if (
        error instanceof ConfluenceFetchError ||
        error instanceof ConfluenceAuthError ||
        error instanceof ConfluenceNotFoundError ||
        error instanceof ConfluenceRateLimitError
      ) {
        throw error;
      }

      // Handle fetch errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ConfluenceFetchError(
            `Request timeout after ${this.timeout}ms`,
            true,
            error,
          );
        }
        throw new ConfluenceFetchError(
          `Network error: ${error.message}`,
          true,
          error,
        );
      }

      throw new ConfluenceFetchError('Unknown fetch error', true);
    }
  }

  /**
   * Builds Basic Auth header for Confluence API.
   */
  private buildAuthHeader(): string {
    const credentials = Buffer.from(
      `${this.userEmail}:${this.apiToken}`,
    ).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Handles HTTP error responses from Confluence API.
   */
  private handleHttpError(response: Response, pageId: string): never {
    const status = response.status;

    switch (status) {
      case 401:
        throw new ConfluenceAuthError(
          'Invalid Confluence credentials',
          HttpStatus.UNAUTHORIZED,
        );
      case 403:
        throw new ConfluenceAuthError(
          'Insufficient permissions to access this page',
          HttpStatus.FORBIDDEN,
        );
      case 404:
        throw new ConfluenceNotFoundError(pageId);
      case 429: {
        const retryAfter = response.headers.get('Retry-After');
        throw new ConfluenceRateLimitError(
          retryAfter ? parseInt(retryAfter, 10) : undefined,
        );
      }
      default: {
        const isRetryable = status >= 500;
        throw new ConfluenceFetchError(
          `HTTP ${status}: ${response.statusText}`,
          isRetryable,
        );
      }
    }
  }

  /**
   * Extracts plain text content from Confluence storage format.
   */
  private extractContent(storageFormat: string): string {
    try {
      // Remove Confluence-specific macros
      const cleanedHtml = this.removeConfluenceMacros(storageFormat);

      // Parse HTML and extract text
      const dom = new JSDOM(cleanedHtml);
      const textContent = dom.window.document.body?.textContent ?? '';

      // Normalize whitespace
      const normalized = textContent.replace(/\s+/g, ' ').trim();

      if (!normalized) {
        throw new ConfluenceContentExtractionError(
          'Failed to extract meaningful content from Confluence page',
        );
      }

      return normalized;
    } catch (error) {
      if (error instanceof ConfluenceContentExtractionError) {
        throw error;
      }
      throw new ConfluenceContentExtractionError(
        `Failed to parse Confluence content: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Removes Confluence-specific XML elements from storage format.
   */
  private removeConfluenceMacros(html: string): string {
    return html
      // Remove ac:structured-macro and other ac:* elements with content
      .replace(/<ac:[^>]*>[\s\S]*?<\/ac:[^>]*>/gi, '')
      // Remove self-closing ac:* elements
      .replace(/<ac:[^>]*\/>/gi, '')
      // Remove ri:* elements with content
      .replace(/<ri:[^>]*>[\s\S]*?<\/ri:[^>]*>/gi, '')
      // Remove self-closing ri:* elements
      .replace(/<ri:[^>]*\/>/gi, '');
  }

  /**
   * Builds the web UI URL from page response.
   */
  private buildWebUrl(page: ConfluencePageResponse): string {
    if (page._links?.webui && page._links?.base) {
      return `${page._links.base}${page._links.webui}`;
    }
    return `${this.baseUrl}/wiki/spaces/unknown/pages/${page.id}`;
  }
}
