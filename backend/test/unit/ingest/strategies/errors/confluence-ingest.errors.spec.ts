import { HttpStatus } from '@nestjs/common';
import {
  ConfluenceIngestError,
  ConfluenceUrlValidationError,
  ConfluenceAuthError,
  ConfluenceNotFoundError,
  ConfluenceRateLimitError,
  ConfluenceFetchError,
  ConfluenceContentExtractionError,
  ConfluenceConfigError,
} from '@ingest/strategies/errors/confluence-ingest.errors';

describe('Confluence Ingest Errors', () => {
  describe('ConfluenceIngestError (base class)', () => {
    it('should create error with correct message and status', () => {
      const error = new ConfluenceIngestError(
        'Test error',
        HttpStatus.BAD_REQUEST,
        false,
      );

      expect(error.message).toBe('Test error');
      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(error.isRetryable).toBe(false);
    });

    it('should store original error when provided', () => {
      const originalError = new Error('Original');
      const error = new ConfluenceIngestError(
        'Wrapped error',
        HttpStatus.BAD_GATEWAY,
        true,
        originalError,
      );

      expect(error.originalError).toBe(originalError);
      expect(error.isRetryable).toBe(true);
    });

    it('should be instance of HttpException', () => {
      const error = new ConfluenceIngestError(
        'Test',
        HttpStatus.BAD_REQUEST,
        false,
      );

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ConfluenceUrlValidationError', () => {
    it('should create error with 400 status and non-retryable', () => {
      const error = new ConfluenceUrlValidationError('Invalid URL format');

      expect(error.message).toBe('Invalid URL format');
      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(error.isRetryable).toBe(false);
    });

    it('should be instance of ConfluenceIngestError', () => {
      const error = new ConfluenceUrlValidationError('Test');

      expect(error).toBeInstanceOf(ConfluenceIngestError);
    });
  });

  describe('ConfluenceAuthError', () => {
    it('should create error with UNAUTHORIZED status by default', () => {
      const error = new ConfluenceAuthError('Invalid credentials');

      expect(error.message).toBe('Invalid credentials');
      expect(error.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(error.isRetryable).toBe(false);
    });

    it('should support FORBIDDEN status', () => {
      const error = new ConfluenceAuthError(
        'Insufficient permissions',
        HttpStatus.FORBIDDEN,
      );

      expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(error.isRetryable).toBe(false);
    });

    it('should be instance of ConfluenceIngestError', () => {
      const error = new ConfluenceAuthError('Test');

      expect(error).toBeInstanceOf(ConfluenceIngestError);
    });
  });

  describe('ConfluenceNotFoundError', () => {
    it('should create error with 404 status and include page ID in message', () => {
      const error = new ConfluenceNotFoundError('123456');

      expect(error.message).toBe('Confluence page not found: 123456');
      expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(error.isRetryable).toBe(false);
    });

    it('should be instance of ConfluenceIngestError', () => {
      const error = new ConfluenceNotFoundError('123');

      expect(error).toBeInstanceOf(ConfluenceIngestError);
    });
  });

  describe('ConfluenceRateLimitError', () => {
    it('should create retryable error with 429 status', () => {
      const error = new ConfluenceRateLimitError();

      expect(error.message).toBe('Confluence rate limit exceeded');
      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(error.isRetryable).toBe(true);
    });

    it('should include retry-after in message when provided', () => {
      const error = new ConfluenceRateLimitError(60);

      expect(error.message).toBe(
        'Confluence rate limit exceeded. Retry after 60s',
      );
      expect(error.isRetryable).toBe(true);
    });

    it('should be instance of ConfluenceIngestError', () => {
      const error = new ConfluenceRateLimitError();

      expect(error).toBeInstanceOf(ConfluenceIngestError);
    });
  });

  describe('ConfluenceFetchError', () => {
    it('should create retryable error with BAD_GATEWAY status', () => {
      const error = new ConfluenceFetchError('Server error', true);

      expect(error.message).toBe('Server error');
      expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
      expect(error.isRetryable).toBe(true);
    });

    it('should create non-retryable error with BAD_REQUEST status', () => {
      const error = new ConfluenceFetchError('Client error', false);

      expect(error.message).toBe('Client error');
      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(error.isRetryable).toBe(false);
    });

    it('should store original error when provided', () => {
      const originalError = new Error('Network failed');
      const error = new ConfluenceFetchError('Network error', true, originalError);

      expect(error.originalError).toBe(originalError);
    });

    it('should be instance of ConfluenceIngestError', () => {
      const error = new ConfluenceFetchError('Test', true);

      expect(error).toBeInstanceOf(ConfluenceIngestError);
    });
  });

  describe('ConfluenceContentExtractionError', () => {
    it('should create error with UNPROCESSABLE_ENTITY status', () => {
      const error = new ConfluenceContentExtractionError(
        'Failed to parse content',
      );

      expect(error.message).toBe('Failed to parse content');
      expect(error.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(error.isRetryable).toBe(false);
    });

    it('should be instance of ConfluenceIngestError', () => {
      const error = new ConfluenceContentExtractionError('Test');

      expect(error).toBeInstanceOf(ConfluenceIngestError);
    });
  });

  describe('ConfluenceConfigError', () => {
    it('should create error with SERVICE_UNAVAILABLE status', () => {
      const error = new ConfluenceConfigError('Missing configuration');

      expect(error.message).toBe('Missing configuration');
      expect(error.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(error.isRetryable).toBe(false);
    });

    it('should be instance of ConfluenceIngestError', () => {
      const error = new ConfluenceConfigError('Test');

      expect(error).toBeInstanceOf(ConfluenceIngestError);
    });
  });
});
