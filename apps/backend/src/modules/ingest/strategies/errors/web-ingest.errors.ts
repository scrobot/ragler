import { HttpException, HttpStatus } from '@nestjs/common';

export class WebIngestError extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    public readonly isRetryable: boolean,
    public readonly originalError?: Error,
  ) {
    super(message, status);
  }
}

export class UrlValidationError extends WebIngestError {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST, false);
  }
}

export class FetchError extends WebIngestError {
  constructor(message: string, isRetryable: boolean, originalError?: Error) {
    super(
      message,
      isRetryable ? HttpStatus.BAD_GATEWAY : HttpStatus.BAD_REQUEST,
      isRetryable,
      originalError,
    );
  }
}

export class ContentExtractionError extends WebIngestError {
  constructor(message: string) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, false);
  }
}
