import { IngestManualSchema } from '@ingest/dto/ingest-manual.dto';
import { IngestConfluenceSchema } from '@ingest/dto/ingest-confluence.dto';
import { IngestWebSchema } from '@ingest/dto/ingest-web.dto';
import { SourceTypeEnum } from '@ingest/dto/ingest.dto';
import { IngestFileSchema } from '@ingest/dto/ingest-file.dto';

describe('Ingest DTOs', () => {
  describe('IngestManualSchema', () => {
    it('should accept valid manual request with content', () => {
      const result = IngestManualSchema.safeParse({
        content: 'Some content',
      });
      expect(result.success).toBe(true);
    });

    it('should reject manual request without content', () => {
      const result = IngestManualSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty content string', () => {
      const result = IngestManualSchema.safeParse({
        content: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Content cannot be empty');
      }
    });

    it('should accept content at minimum length (1 character)', () => {
      const result = IngestManualSchema.safeParse({
        content: 'X',
      });
      expect(result.success).toBe(true);
    });

    it('should accept content at maximum length (100KB)', () => {
      const result = IngestManualSchema.safeParse({
        content: 'a'.repeat(102400),
      });
      expect(result.success).toBe(true);
    });

    it('should reject content exceeding maximum length (100KB)', () => {
      const result = IngestManualSchema.safeParse({
        content: 'a'.repeat(102401),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Content exceeds maximum length');
      }
    });
  });

  describe('IngestWebSchema', () => {
    it('should accept valid web request with URL', () => {
      const result = IngestWebSchema.safeParse({
        url: 'https://example.com/page',
      });
      expect(result.success).toBe(true);
    });

    it('should reject web request without URL', () => {
      const result = IngestWebSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL format', () => {
      const result = IngestWebSchema.safeParse({
        url: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('should accept https URL', () => {
      const result = IngestWebSchema.safeParse({
        url: 'https://example.com/page',
      });
      expect(result.success).toBe(true);
    });

    it('should accept http URL', () => {
      const result = IngestWebSchema.safeParse({
        url: 'http://example.com/page',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('IngestConfluenceSchema', () => {
    it('should accept confluence request with URL', () => {
      const result = IngestConfluenceSchema.safeParse({
        url: 'https://company.atlassian.net/wiki/spaces/SPACE/pages/123456/Title',
      });
      expect(result.success).toBe(true);
    });

    it('should accept confluence request with pageId only', () => {
      const result = IngestConfluenceSchema.safeParse({
        pageId: '123456',
      });
      expect(result.success).toBe(true);
    });

    it('should accept confluence request with both URL and pageId', () => {
      const result = IngestConfluenceSchema.safeParse({
        url: 'https://company.atlassian.net/wiki/spaces/SPACE/pages/123456/Title',
        pageId: '123456',
      });
      expect(result.success).toBe(true);
    });

    it('should reject confluence request without URL or pageId', () => {
      const result = IngestConfluenceSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric pageId', () => {
      const result = IngestConfluenceSchema.safeParse({
        pageId: 'abc123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Page ID must be numeric');
      }
    });

    it('should reject pageId with decimal', () => {
      const result = IngestConfluenceSchema.safeParse({
        pageId: '123.456',
      });
      expect(result.success).toBe(false);
    });

    it('should reject pageId with negative number', () => {
      const result = IngestConfluenceSchema.safeParse({
        pageId: '-123',
      });
      expect(result.success).toBe(false);
    });

    it('should accept large numeric pageId', () => {
      const result = IngestConfluenceSchema.safeParse({
        pageId: '9876543210',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('SourceTypeEnum', () => {
    it('should accept all valid source types', () => {
      const validTypes = ['confluence', 'web', 'manual', 'file'];
      for (const type of validTypes) {
        const result = SourceTypeEnum.safeParse(type);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid source type', () => {
      const result = SourceTypeEnum.safeParse('invalid');
      expect(result.success).toBe(false);
    });

    it('should reject empty string as source type', () => {
      const result = SourceTypeEnum.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('IngestFileSchema', () => {
    it('should accept empty object (file comes via multipart)', () => {
      const result = IngestFileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept object with extra fields (stripped by Zod)', () => {
      const result = IngestFileSchema.safeParse({ extra: 'field' });
      expect(result.success).toBe(true);
    });
  });
});
