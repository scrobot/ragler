import { IngestRequestSchema } from '@ingest/dto/ingest.dto';

describe('IngestRequestSchema', () => {
  describe('manual source type', () => {
    it('should accept valid manual request with content', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'manual',
        content: 'Some content',
      });
      expect(result.success).toBe(true);
    });

    it('should reject manual request without content', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'manual',
      });
      expect(result.success).toBe(false);
    });

    it('should reject manual request with pageId (invalid for manual)', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'manual',
        content: 'Some content',
        pageId: '123456',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('pageId is only valid for confluence');
      }
    });
  });

  describe('web source type', () => {
    it('should accept valid web request with URL', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'web',
        url: 'https://example.com/page',
      });
      expect(result.success).toBe(true);
    });

    it('should reject web request without URL', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'web',
      });
      expect(result.success).toBe(false);
    });

    it('should reject web request with pageId (invalid for web)', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'web',
        url: 'https://example.com/page',
        pageId: '123456',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('pageId is only valid for confluence');
      }
    });
  });

  describe('confluence source type', () => {
    it('should accept confluence request with URL', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'confluence',
        url: 'https://company.atlassian.net/wiki/spaces/SPACE/pages/123456/Title',
      });
      expect(result.success).toBe(true);
    });

    it('should accept confluence request with pageId only', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'confluence',
        pageId: '123456',
      });
      expect(result.success).toBe(true);
    });

    it('should accept confluence request with both URL and pageId', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'confluence',
        url: 'https://company.atlassian.net/wiki/spaces/SPACE/pages/123456/Title',
        pageId: '123456',
      });
      expect(result.success).toBe(true);
    });

    it('should reject confluence request without URL or pageId', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'confluence',
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric pageId', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'confluence',
        pageId: 'abc123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Page ID must be numeric');
      }
    });

    it('should reject pageId with decimal', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'confluence',
        pageId: '123.456',
      });
      expect(result.success).toBe(false);
    });

    it('should reject pageId with negative number', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'confluence',
        pageId: '-123',
      });
      expect(result.success).toBe(false);
    });

    it('should accept large numeric pageId', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'confluence',
        pageId: '9876543210',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('URL validation', () => {
    it('should reject invalid URL format', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'web',
        url: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('should accept https URL', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'web',
        url: 'https://example.com/page',
      });
      expect(result.success).toBe(true);
    });

    it('should accept http URL (scheme validation is done by strategy)', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'web',
        url: 'http://example.com/page',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('content validation', () => {
    it('should reject empty content string', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'manual',
        content: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Content cannot be empty');
      }
    });

    it('should accept content at minimum length (1 character)', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'manual',
        content: 'X',
      });
      expect(result.success).toBe(true);
    });

    it('should accept content at maximum length (100KB)', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'manual',
        content: 'a'.repeat(102400),
      });
      expect(result.success).toBe(true);
    });

    it('should reject content exceeding maximum length (100KB)', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'manual',
        content: 'a'.repeat(102401),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Content exceeds maximum length');
      }
    });

    it('should accept typical content', () => {
      const result = IngestRequestSchema.safeParse({
        sourceType: 'manual',
        content: 'This is typical content that a user might enter.',
      });
      expect(result.success).toBe(true);
    });
  });
});
