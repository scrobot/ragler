import { ConfluenceUrlValidationError } from '../errors/confluence-ingest.errors';

/**
 * Pattern to extract page ID from Confluence Cloud URLs.
 * Matches: /wiki/spaces/{spaceKey}/pages/{pageId}/{optional-title}
 */
const CONFLUENCE_PAGE_URL_PATTERN = /\/wiki\/spaces\/[^/]+\/pages\/(\d+)/i;

/**
 * Pattern for valid Atlassian Cloud domains.
 * Matches: {subdomain}.atlassian.net
 */
const ATLASSIAN_CLOUD_DOMAIN_PATTERN = /^[a-z0-9-]+\.atlassian\.net$/i;

/**
 * Blocked hostnames (private/internal addresses).
 */
const BLOCKED_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
];

/**
 * Validates a page ID format.
 * Page IDs must be numeric strings.
 *
 * @param pageId - The page ID to validate
 * @returns true if valid numeric page ID
 */
export function isValidPageId(pageId: string): boolean {
  return /^\d+$/.test(pageId);
}

/**
 * Validates a Confluence URL and returns the parsed URL object.
 *
 * @param urlString - The URL string to validate
 * @param allowedBaseUrl - Optional configured base URL to allow (for self-hosted)
 * @returns Parsed URL object
 * @throws ConfluenceUrlValidationError if URL is invalid
 */
export function validateConfluenceUrl(
  urlString: string,
  allowedBaseUrl?: string,
): URL {
  let url: URL;

  // Parse URL
  try {
    url = new URL(urlString);
  } catch {
    throw new ConfluenceUrlValidationError(
      `Invalid URL format: ${urlString}`,
    );
  }

  // Validate scheme (HTTPS only for security)
  if (url.protocol !== 'https:') {
    throw new ConfluenceUrlValidationError(
      `Invalid URL scheme: ${url.protocol}. Only https is allowed for Confluence.`,
    );
  }

  // Block private/internal addresses
  if (BLOCKED_HOSTNAMES.includes(url.hostname.toLowerCase())) {
    throw new ConfluenceUrlValidationError(
      `Access to private/internal addresses is not allowed: ${url.hostname}`,
    );
  }

  // Validate domain
  const isAtlassianCloud = ATLASSIAN_CLOUD_DOMAIN_PATTERN.test(url.hostname);
  const isConfiguredDomain =
    allowedBaseUrl && new URL(allowedBaseUrl).hostname === url.hostname;

  if (!isAtlassianCloud && !isConfiguredDomain) {
    throw new ConfluenceUrlValidationError(
      `Invalid Confluence domain: ${url.hostname}. Must be *.atlassian.net or configured base URL.`,
    );
  }

  return url;
}

/**
 * Extracts the page ID from a validated Confluence URL.
 *
 * Supported URL formats:
 * - /wiki/spaces/{spaceKey}/pages/{pageId}/{title}
 * - /wiki/spaces/{spaceKey}/pages/{pageId}
 *
 * NOT supported (out of scope for MVP):
 * - /wiki/display/{spaceKey}/{title} (legacy format, requires API lookup)
 * - /wiki/x/{shortlink} (short links)
 *
 * @param url - Parsed URL object
 * @returns Page ID string
 * @throws ConfluenceUrlValidationError if page ID cannot be extracted
 */
export function extractPageIdFromUrl(url: URL): string {
  const match = url.pathname.match(CONFLUENCE_PAGE_URL_PATTERN);

  if (!match || !match[1]) {
    throw new ConfluenceUrlValidationError(
      `Cannot extract page ID from URL. Expected format: /wiki/spaces/{spaceKey}/pages/{pageId}/{title}`,
    );
  }

  return match[1];
}
