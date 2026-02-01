import {
  validateConfluenceUrl,
  extractPageIdFromUrl,
  isValidPageId,
} from '@ingest/strategies/utils/confluence-url-validator';
import { ConfluenceUrlValidationError } from '@ingest/strategies/errors/confluence-ingest.errors';

describe('Confluence URL Validator', () => {
  describe('isValidPageId', () => {
    it('should return true for valid numeric page IDs', () => {
      expect(isValidPageId('123456')).toBe(true);
      expect(isValidPageId('1')).toBe(true);
      expect(isValidPageId('9999999999')).toBe(true);
    });

    it('should return false for non-numeric strings', () => {
      expect(isValidPageId('abc')).toBe(false);
      expect(isValidPageId('123abc')).toBe(false);
      expect(isValidPageId('12.34')).toBe(false);
      expect(isValidPageId('-123')).toBe(false);
      expect(isValidPageId('')).toBe(false);
      expect(isValidPageId(' ')).toBe(false);
    });
  });

  describe('validateConfluenceUrl', () => {
    describe('URL format validation', () => {
      it('should reject invalid URL format', () => {
        expect(() => validateConfluenceUrl('not-a-url')).toThrow(
          ConfluenceUrlValidationError,
        );
        expect(() => validateConfluenceUrl('not-a-url')).toThrow(
          'Invalid URL format',
        );
      });

      it('should reject empty string', () => {
        expect(() => validateConfluenceUrl('')).toThrow(
          ConfluenceUrlValidationError,
        );
      });

      it('should reject non-http schemes', () => {
        expect(() =>
          validateConfluenceUrl('ftp://example.atlassian.net/wiki/spaces/SPACE/pages/123/Title'),
        ).toThrow(ConfluenceUrlValidationError);
        expect(() =>
          validateConfluenceUrl('ftp://example.atlassian.net/wiki/spaces/SPACE/pages/123/Title'),
        ).toThrow('Only https is allowed');
      });

      it('should reject file:// scheme', () => {
        expect(() => validateConfluenceUrl('file:///etc/passwd')).toThrow(
          ConfluenceUrlValidationError,
        );
      });

      it('should reject javascript: scheme', () => {
        expect(() => validateConfluenceUrl('javascript:alert(1)')).toThrow(
          ConfluenceUrlValidationError,
        );
      });
    });

    describe('domain validation', () => {
      it('should accept valid Atlassian Cloud domains', () => {
        const url = validateConfluenceUrl(
          'https://mycompany.atlassian.net/wiki/spaces/SPACE/pages/123456/Title',
        );
        expect(url.hostname).toBe('mycompany.atlassian.net');
      });

      it('should accept Atlassian domain with various subdomains', () => {
        expect(() =>
          validateConfluenceUrl(
            'https://test-org.atlassian.net/wiki/spaces/DEV/pages/123/Page',
          ),
        ).not.toThrow();
        expect(() =>
          validateConfluenceUrl(
            'https://my-company-123.atlassian.net/wiki/spaces/TEAM/pages/456/Doc',
          ),
        ).not.toThrow();
      });

      it('should reject non-Atlassian domains without configured baseUrl', () => {
        expect(() =>
          validateConfluenceUrl('https://example.com/wiki/spaces/SPACE/pages/123/Title'),
        ).toThrow(ConfluenceUrlValidationError);
        expect(() =>
          validateConfluenceUrl('https://example.com/wiki/spaces/SPACE/pages/123/Title'),
        ).toThrow('Must be *.atlassian.net or configured base URL');
      });

      it('should reject private/internal addresses', () => {
        expect(() =>
          validateConfluenceUrl('https://localhost/wiki/spaces/SPACE/pages/123/Title'),
        ).toThrow(ConfluenceUrlValidationError);
        expect(() =>
          validateConfluenceUrl('https://127.0.0.1/wiki/spaces/SPACE/pages/123/Title'),
        ).toThrow(ConfluenceUrlValidationError);
      });

      it('should accept configured base URL domain', () => {
        const allowedBaseUrl = 'https://custom.confluence.local';
        const url = validateConfluenceUrl(
          'https://custom.confluence.local/wiki/spaces/SPACE/pages/123/Title',
          allowedBaseUrl,
        );
        expect(url.hostname).toBe('custom.confluence.local');
      });

      it('should reject domain that does not match configured baseUrl', () => {
        const allowedBaseUrl = 'https://allowed.confluence.local';
        expect(() =>
          validateConfluenceUrl(
            'https://other.confluence.local/wiki/spaces/SPACE/pages/123/Title',
            allowedBaseUrl,
          ),
        ).toThrow(ConfluenceUrlValidationError);
      });
    });

    describe('http to https', () => {
      it('should reject http URLs for security', () => {
        expect(() =>
          validateConfluenceUrl('http://mycompany.atlassian.net/wiki/spaces/SPACE/pages/123/Title'),
        ).toThrow(ConfluenceUrlValidationError);
        expect(() =>
          validateConfluenceUrl('http://mycompany.atlassian.net/wiki/spaces/SPACE/pages/123/Title'),
        ).toThrow('Only https is allowed');
      });
    });
  });

  describe('extractPageIdFromUrl', () => {
    it('should extract page ID from standard page URL', () => {
      const url = new URL(
        'https://mycompany.atlassian.net/wiki/spaces/SPACE/pages/123456/Page-Title',
      );
      expect(extractPageIdFromUrl(url)).toBe('123456');
    });

    it('should extract page ID regardless of title', () => {
      const url = new URL(
        'https://mycompany.atlassian.net/wiki/spaces/DEV/pages/789/My+Document+Title',
      );
      expect(extractPageIdFromUrl(url)).toBe('789');
    });

    it('should extract page ID from URL with query params', () => {
      const url = new URL(
        'https://mycompany.atlassian.net/wiki/spaces/SPACE/pages/123456/Title?src=contextnavpagetreemode',
      );
      expect(extractPageIdFromUrl(url)).toBe('123456');
    });

    it('should extract page ID from URL without title', () => {
      const url = new URL(
        'https://mycompany.atlassian.net/wiki/spaces/SPACE/pages/999888',
      );
      expect(extractPageIdFromUrl(url)).toBe('999888');
    });

    it('should handle large page IDs', () => {
      const url = new URL(
        'https://mycompany.atlassian.net/wiki/spaces/SPACE/pages/9876543210/Title',
      );
      expect(extractPageIdFromUrl(url)).toBe('9876543210');
    });

    it('should throw for legacy display URL format', () => {
      const url = new URL(
        'https://mycompany.atlassian.net/wiki/display/SPACE/Page+Title',
      );
      expect(() => extractPageIdFromUrl(url)).toThrow(
        ConfluenceUrlValidationError,
      );
      expect(() => extractPageIdFromUrl(url)).toThrow(
        'Cannot extract page ID from URL',
      );
    });

    it('should throw for URL without page ID pattern', () => {
      const url = new URL(
        'https://mycompany.atlassian.net/wiki/spaces/SPACE/overview',
      );
      expect(() => extractPageIdFromUrl(url)).toThrow(
        ConfluenceUrlValidationError,
      );
    });

    it('should throw for Confluence home page URL', () => {
      const url = new URL(
        'https://mycompany.atlassian.net/wiki/',
      );
      expect(() => extractPageIdFromUrl(url)).toThrow(
        ConfluenceUrlValidationError,
      );
    });
  });
});
