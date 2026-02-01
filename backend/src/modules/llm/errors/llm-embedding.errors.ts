import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base error class for LLM embedding errors.
 * All embedding-specific errors should extend this class.
 */
export class LlmEmbeddingError extends HttpException {
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
 * Thrown when the input for embedding is invalid (empty array, empty strings).
 * HTTP 400 - Non-retryable
 */
export class LlmEmbeddingValidationError extends LlmEmbeddingError {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST, false);
  }
}

/**
 * Thrown when OpenAI API rate limit is exceeded.
 * HTTP 429 - Retryable (caller should implement backoff)
 */
export class LlmEmbeddingRateLimitError extends LlmEmbeddingError {
  constructor(retryAfterSeconds?: number) {
    const message = retryAfterSeconds
      ? `OpenAI embedding rate limit exceeded. Retry after ${retryAfterSeconds}s`
      : 'OpenAI embedding rate limit exceeded';
    super(message, HttpStatus.TOO_MANY_REQUESTS, true);
  }
}

/**
 * Thrown when the embedding request times out.
 * HTTP 504 - Retryable
 */
export class LlmEmbeddingTimeoutError extends LlmEmbeddingError {
  constructor(timeoutMs: number) {
    super(
      `Embedding request timed out after ${timeoutMs}ms`,
      HttpStatus.GATEWAY_TIMEOUT,
      true,
    );
  }
}

/**
 * Thrown when OpenAI API returns an error (server error, auth error, etc.).
 * HTTP 502 (retryable) or 400 (non-retryable)
 */
export class LlmEmbeddingApiError extends LlmEmbeddingError {
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
