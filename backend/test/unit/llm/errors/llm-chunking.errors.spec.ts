import { HttpStatus } from '@nestjs/common';
import {
  LlmChunkingError,
  LlmChunkingValidationError,
  LlmChunkingRateLimitError,
  LlmChunkingTimeoutError,
  LlmChunkingParseError,
  LlmChunkingApiError,
} from '@modules/llm/errors/llm-chunking.errors';

describe('LlmChunkingError classes', () => {
  describe('LlmChunkingError (base class)', () => {
    it('should create error with message, status, and retryable flag', () => {
      const error = new LlmChunkingError(
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
      const error = new LlmChunkingError(
        'Wrapped error',
        HttpStatus.BAD_GATEWAY,
        true,
        originalError,
      );

      expect(error.originalError).toBe(originalError);
    });

    it('should have undefined originalError when not provided', () => {
      const error = new LlmChunkingError(
        'No original',
        HttpStatus.BAD_REQUEST,
        false,
      );

      expect(error.originalError).toBeUndefined();
    });
  });

  describe('LlmChunkingValidationError', () => {
    it('should have status 400 (BAD_REQUEST)', () => {
      const error = new LlmChunkingValidationError('Invalid input');

      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should be non-retryable', () => {
      const error = new LlmChunkingValidationError('Invalid input');

      expect(error.isRetryable).toBe(false);
    });

    it('should include the validation message', () => {
      const error = new LlmChunkingValidationError(
        'Content cannot be empty or whitespace-only',
      );

      expect(error.message).toBe('Content cannot be empty or whitespace-only');
    });
  });

  describe('LlmChunkingRateLimitError', () => {
    it('should have status 429 (TOO_MANY_REQUESTS)', () => {
      const error = new LlmChunkingRateLimitError();

      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });

    it('should be retryable', () => {
      const error = new LlmChunkingRateLimitError();

      expect(error.isRetryable).toBe(true);
    });

    it('should include retry-after seconds in message when provided', () => {
      const error = new LlmChunkingRateLimitError(30);

      expect(error.message).toBe(
        'OpenAI rate limit exceeded. Retry after 30s',
      );
    });

    it('should use generic message when retry-after not provided', () => {
      const error = new LlmChunkingRateLimitError();

      expect(error.message).toBe('OpenAI rate limit exceeded');
    });
  });

  describe('LlmChunkingTimeoutError', () => {
    it('should have status 504 (GATEWAY_TIMEOUT)', () => {
      const error = new LlmChunkingTimeoutError(60000);

      expect(error.getStatus()).toBe(HttpStatus.GATEWAY_TIMEOUT);
    });

    it('should be retryable', () => {
      const error = new LlmChunkingTimeoutError(60000);

      expect(error.isRetryable).toBe(true);
    });

    it('should include timeout duration in message', () => {
      const error = new LlmChunkingTimeoutError(30000);

      expect(error.message).toBe('Chunking request timed out after 30000ms');
    });
  });

  describe('LlmChunkingParseError', () => {
    it('should have status 422 (UNPROCESSABLE_ENTITY)', () => {
      const error = new LlmChunkingParseError('Invalid JSON');

      expect(error.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    it('should be non-retryable', () => {
      const error = new LlmChunkingParseError('Invalid JSON');

      expect(error.isRetryable).toBe(false);
    });

    it('should include parse error message', () => {
      const error = new LlmChunkingParseError(
        'Failed to parse chunking response',
      );

      expect(error.message).toBe('Failed to parse chunking response');
    });

    it('should store raw response when provided', () => {
      const rawResponse = '{"invalid": json}';
      const error = new LlmChunkingParseError('Parse failed', rawResponse);

      expect(error.rawResponse).toBe(rawResponse);
    });
  });

  describe('LlmChunkingApiError', () => {
    it('should have status 502 (BAD_GATEWAY) when retryable', () => {
      const error = new LlmChunkingApiError('Server error', true);

      expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
    });

    it('should have status 400 (BAD_REQUEST) when non-retryable', () => {
      const error = new LlmChunkingApiError('Client error', false);

      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should respect isRetryable flag for server errors (5xx)', () => {
      const error = new LlmChunkingApiError('Internal server error', true);

      expect(error.isRetryable).toBe(true);
    });

    it('should respect isRetryable flag for client errors (4xx)', () => {
      const error = new LlmChunkingApiError('Bad request', false);

      expect(error.isRetryable).toBe(false);
    });

    it('should store original error when provided', () => {
      const originalError = new Error('OpenAI SDK error');
      const error = new LlmChunkingApiError(
        'API call failed',
        true,
        originalError,
      );

      expect(error.originalError).toBe(originalError);
    });

    it('should include error message', () => {
      const error = new LlmChunkingApiError(
        'OpenAI server error: Service unavailable',
        true,
      );

      expect(error.message).toBe('OpenAI server error: Service unavailable');
    });
  });

  describe('Error inheritance', () => {
    it('all errors should be instanceof LlmChunkingError', () => {
      const errors = [
        new LlmChunkingValidationError('test'),
        new LlmChunkingRateLimitError(),
        new LlmChunkingTimeoutError(1000),
        new LlmChunkingParseError('test'),
        new LlmChunkingApiError('test', true),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(LlmChunkingError);
      });
    });

    it('all errors should be instanceof Error', () => {
      const errors = [
        new LlmChunkingValidationError('test'),
        new LlmChunkingRateLimitError(),
        new LlmChunkingTimeoutError(1000),
        new LlmChunkingParseError('test'),
        new LlmChunkingApiError('test', true),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
      });
    });
  });
});
