import { HttpStatus } from '@nestjs/common';
import {
  LlmEmbeddingError,
  LlmEmbeddingValidationError,
  LlmEmbeddingRateLimitError,
  LlmEmbeddingTimeoutError,
  LlmEmbeddingApiError,
} from '@modules/llm/errors/llm-embedding.errors';

describe('LlmEmbeddingError classes', () => {
  describe('LlmEmbeddingError (base class)', () => {
    it('should create error with message, status, and retryable flag', () => {
      const error = new LlmEmbeddingError(
        'Test error',
        HttpStatus.INTERNAL_SERVER_ERROR,
        true,
      );

      expect(error.message).toBe('Test error');
      expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(error.isRetryable).toBe(true);
    });

    it('should store original error when provided', () => {
      const originalError = new Error('Original');
      const error = new LlmEmbeddingError(
        'Wrapped error',
        HttpStatus.BAD_GATEWAY,
        true,
        originalError,
      );

      expect(error.originalError).toBe(originalError);
    });

    it('should have undefined originalError when not provided', () => {
      const error = new LlmEmbeddingError(
        'No original',
        HttpStatus.BAD_REQUEST,
        false,
      );

      expect(error.originalError).toBeUndefined();
    });
  });

  describe('LlmEmbeddingValidationError', () => {
    it('should have status 400 (BAD_REQUEST)', () => {
      const error = new LlmEmbeddingValidationError('Invalid input');

      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should be non-retryable', () => {
      const error = new LlmEmbeddingValidationError('Invalid input');

      expect(error.isRetryable).toBe(false);
    });

    it('should include the validation message', () => {
      const error = new LlmEmbeddingValidationError(
        'Text array cannot contain empty strings',
      );

      expect(error.message).toBe('Text array cannot contain empty strings');
    });
  });

  describe('LlmEmbeddingRateLimitError', () => {
    it('should have status 429 (TOO_MANY_REQUESTS)', () => {
      const error = new LlmEmbeddingRateLimitError();

      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });

    it('should be retryable', () => {
      const error = new LlmEmbeddingRateLimitError();

      expect(error.isRetryable).toBe(true);
    });

    it('should include retry-after seconds in message when provided', () => {
      const error = new LlmEmbeddingRateLimitError(30);

      expect(error.message).toBe(
        'OpenAI embedding rate limit exceeded. Retry after 30s',
      );
    });

    it('should use generic message when retry-after not provided', () => {
      const error = new LlmEmbeddingRateLimitError();

      expect(error.message).toBe('OpenAI embedding rate limit exceeded');
    });
  });

  describe('LlmEmbeddingTimeoutError', () => {
    it('should have status 504 (GATEWAY_TIMEOUT)', () => {
      const error = new LlmEmbeddingTimeoutError(60000);

      expect(error.getStatus()).toBe(HttpStatus.GATEWAY_TIMEOUT);
    });

    it('should be retryable', () => {
      const error = new LlmEmbeddingTimeoutError(60000);

      expect(error.isRetryable).toBe(true);
    });

    it('should include timeout duration in message', () => {
      const error = new LlmEmbeddingTimeoutError(30000);

      expect(error.message).toBe('Embedding request timed out after 30000ms');
    });
  });

  describe('LlmEmbeddingApiError', () => {
    it('should have status 502 (BAD_GATEWAY) when retryable', () => {
      const error = new LlmEmbeddingApiError('Server error', true);

      expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
    });

    it('should have status 400 (BAD_REQUEST) when non-retryable', () => {
      const error = new LlmEmbeddingApiError('Client error', false);

      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should respect isRetryable flag for server errors (5xx)', () => {
      const error = new LlmEmbeddingApiError('Internal server error', true);

      expect(error.isRetryable).toBe(true);
    });

    it('should respect isRetryable flag for client errors (4xx)', () => {
      const error = new LlmEmbeddingApiError('Bad request', false);

      expect(error.isRetryable).toBe(false);
    });

    it('should store original error when provided', () => {
      const originalError = new Error('OpenAI SDK error');
      const error = new LlmEmbeddingApiError(
        'API call failed',
        true,
        originalError,
      );

      expect(error.originalError).toBe(originalError);
    });

    it('should include error message', () => {
      const error = new LlmEmbeddingApiError(
        'OpenAI server error: Service unavailable',
        true,
      );

      expect(error.message).toBe('OpenAI server error: Service unavailable');
    });
  });

  describe('Error inheritance', () => {
    it('all errors should be instanceof LlmEmbeddingError', () => {
      const errors = [
        new LlmEmbeddingValidationError('test'),
        new LlmEmbeddingRateLimitError(),
        new LlmEmbeddingTimeoutError(1000),
        new LlmEmbeddingApiError('test', true),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(LlmEmbeddingError);
      });
    });

    it('all errors should be instanceof Error', () => {
      const errors = [
        new LlmEmbeddingValidationError('test'),
        new LlmEmbeddingRateLimitError(),
        new LlmEmbeddingTimeoutError(1000),
        new LlmEmbeddingApiError('test', true),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
      });
    });
  });
});
