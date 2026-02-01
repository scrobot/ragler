import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base error class for Confluence ingestion errors.
 * All Confluence-specific errors should extend this class.
 */
export class ConfluenceIngestError extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    public readonly isRetryable: boolean,
    public readonly originalError?: Error,
  ) {
    super(message, status);
  }
}

/**
 * Thrown when the Confluence URL format is invalid or domain is not allowed.
 * HTTP 400 - Non-retryable
 */
export class ConfluenceUrlValidationError extends ConfluenceIngestError {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST, false);
  }
}

/**
 * Thrown when authentication fails (invalid credentials or insufficient permissions).
 * HTTP 401/403 - Non-retryable
 */
export class ConfluenceAuthError extends ConfluenceIngestError {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.UNAUTHORIZED,
  ) {
    super(message, status, false);
  }
}

/**
 * Thrown when the requested Confluence page does not exist.
 * HTTP 404 - Non-retryable
 */
export class ConfluenceNotFoundError extends ConfluenceIngestError {
  constructor(pageId: string) {
    super(`Confluence page not found: ${pageId}`, HttpStatus.NOT_FOUND, false);
  }
}

/**
 * Thrown when Confluence API rate limit is exceeded.
 * HTTP 429 - Retryable (caller should implement backoff)
 */
export class ConfluenceRateLimitError extends ConfluenceIngestError {
  constructor(retryAfterSeconds?: number) {
    const message = retryAfterSeconds
      ? `Confluence rate limit exceeded. Retry after ${retryAfterSeconds}s`
      : 'Confluence rate limit exceeded';
    super(message, HttpStatus.TOO_MANY_REQUESTS, true);
  }
}

/**
 * Thrown when HTTP fetch fails (network error, timeout, server error).
 * HTTP 502 (retryable) or 400 (non-retryable)
 */
export class ConfluenceFetchError extends ConfluenceIngestError {
  constructor(
    message: string,
    isRetryable: boolean,
    originalError?: Error,
  ) {
    super(
      message,
      isRetryable ? HttpStatus.BAD_GATEWAY : HttpStatus.BAD_REQUEST,
      isRetryable,
      originalError,
    );
  }
}

/**
 * Thrown when content extraction from Confluence storage format fails.
 * HTTP 422 - Non-retryable
 */
export class ConfluenceContentExtractionError extends ConfluenceIngestError {
  constructor(message: string) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, false);
  }
}

/**
 * Thrown when required Confluence configuration is missing.
 * HTTP 503 - Non-retryable (requires configuration fix)
 */
export class ConfluenceConfigError extends ConfluenceIngestError {
  constructor(message: string) {
    super(message, HttpStatus.SERVICE_UNAVAILABLE, false);
  }
}
