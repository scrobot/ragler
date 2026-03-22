import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base error class for Manual ingestion errors.
 * All Manual-specific errors should extend this class.
 */
export class ManualIngestError extends HttpException {
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
 * Thrown when content validation fails (empty, whitespace-only, too long, too short).
 * HTTP 400 - Non-retryable (user must fix content)
 */
export class ManualContentValidationError extends ManualIngestError {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST, false);
  }
}
