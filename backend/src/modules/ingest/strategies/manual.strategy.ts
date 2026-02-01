import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { IngestStrategy, IngestResult } from './ingest.strategy';
import { SourceType } from '@ingest/dto';
import { ManualContentValidationError } from './errors/manual-ingest.errors';

@Injectable()
export class ManualStrategy implements IngestStrategy {
  readonly sourceType: SourceType = 'manual';
  private readonly logger = new Logger(ManualStrategy.name);

  private readonly maxContentLength: number;
  private readonly minContentLength: number;

  constructor(private readonly configService: ConfigService) {
    this.maxContentLength =
      this.configService.get<number>('manual.maxContentLength') ?? 102400;
    this.minContentLength =
      this.configService.get<number>('manual.minContentLength') ?? 1;
  }

  async ingest(content: string): Promise<IngestResult> {
    const startTime = Date.now();
    const contentHash = this.computeContentHash(content);

    this.logger.log({
      event: 'ingest_start',
      sourceType: this.sourceType,
      contentLength: content?.length ?? 0,
      contentHash,
    });

    try {
      // 1. Validate content
      this.validateContent(content);

      // 2. Sanitize content (normalize whitespace)
      const sanitizedContent = this.sanitizeContent(content);

      // 3. Generate deterministic source URL for idempotency
      const sourceUrl = `manual://${contentHash}`;

      // 4. Generate title from content preview
      const title = this.generateTitle(sanitizedContent);

      const duration = Date.now() - startTime;
      this.logger.log({
        event: 'ingest_success',
        sourceType: this.sourceType,
        durationMs: duration,
        contentLength: sanitizedContent.length,
        contentHash,
        sourceUrl,
      });

      return {
        content: sanitizedContent,
        title,
        sourceUrl,
        metadata: {
          contentHash,
          originalLength: content.length,
          sanitizedLength: sanitizedContent.length,
          createdAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error({
        event: 'ingest_failure',
        sourceType: this.sourceType,
        durationMs: duration,
        contentLength: content?.length ?? 0,
        contentHash,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        isRetryable:
          error instanceof ManualContentValidationError
            ? error.isRetryable
            : false,
      });
      throw error;
    }
  }

  /**
   * Validates content meets requirements.
   */
  private validateContent(content: string): void {
    // Check for null/undefined
    if (content == null) {
      throw new ManualContentValidationError('Content is required');
    }

    // Check for empty string
    if (content.length === 0) {
      throw new ManualContentValidationError('Content cannot be empty');
    }

    // Check max length first (before trimming to avoid processing huge strings)
    if (content.length > this.maxContentLength) {
      throw new ManualContentValidationError(
        `Content exceeds maximum length of ${this.maxContentLength} bytes (received ${content.length})`,
      );
    }

    // Check for whitespace-only content
    const trimmed = content.trim();
    if (trimmed.length < this.minContentLength) {
      throw new ManualContentValidationError(
        `Content must contain at least ${this.minContentLength} non-whitespace character(s)`,
      );
    }
  }

  /**
   * Sanitizes content by normalizing whitespace.
   * Note: HTML sanitization is intentionally NOT performed here because
   * content is stored as plain text and rendered safely by the frontend.
   */
  private sanitizeContent(content: string): string {
    // Normalize line endings: CRLF -> LF, CR -> LF
    let sanitized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Collapse multiple consecutive blank lines to maximum of 2
    sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

    // Trim leading/trailing whitespace
    sanitized = sanitized.trim();

    return sanitized;
  }

  /**
   * Computes MD5 hash of content for source_id (idempotency).
   * Per SAD: source_id = MD5(content) ensures same content produces same source_id.
   */
  private computeContentHash(content: string): string {
    if (!content) return 'empty';
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Generates a title from content preview.
   */
  private generateTitle(content: string): string {
    const firstLine = content.split('\n')[0] || '';
    const preview = firstLine.substring(0, 50).trim();

    if (preview.length === 0) {
      return 'Manual Input';
    }

    // Add ellipsis if truncated
    if (firstLine.length > 50) {
      return `${preview}...`;
    }

    return preview;
  }
}
