import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base error class for LLM chunking errors.
 * All chunking-specific errors should extend this class.
 */
export class LlmChunkingError extends HttpException {
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
 * Thrown when the input content is invalid (empty, whitespace-only).
 * HTTP 400 - Non-retryable
 */
export class LlmChunkingValidationError extends LlmChunkingError {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST, false);
  }
}

/**
 * Thrown when OpenAI API rate limit is exceeded.
 * HTTP 429 - Retryable (caller should implement backoff)
 */
export class LlmChunkingRateLimitError extends LlmChunkingError {
  constructor(retryAfterSeconds?: number) {
    const message = retryAfterSeconds
      ? `OpenAI rate limit exceeded. Retry after ${retryAfterSeconds}s`
      : 'OpenAI rate limit exceeded';
    super(message, HttpStatus.TOO_MANY_REQUESTS, true);
  }
}

/**
 * Thrown when the chunking request times out.
 * HTTP 504 - Retryable
 */
export class LlmChunkingTimeoutError extends LlmChunkingError {
  constructor(timeoutMs: number) {
    super(
      `Chunking request timed out after ${timeoutMs}ms`,
      HttpStatus.GATEWAY_TIMEOUT,
      true,
    );
  }
}

/**
 * Thrown when the LLM response cannot be parsed as valid JSON.
 * HTTP 422 - Non-retryable
 */
export class LlmChunkingParseError extends LlmChunkingError {
  constructor(
    message: string,
    public readonly rawResponse?: string,
  ) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, false);
  }
}

/**
 * Thrown when OpenAI API returns an error (server error, auth error, etc.).
 * HTTP 502 (retryable) or 400 (non-retryable)
 */
export class LlmChunkingApiError extends LlmChunkingError {
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
