import { UrlValidationError } from '../errors/web-ingest.errors';

const PRIVATE_IP_PATTERNS = [
  /^127\./, // 127.0.0.0/8 (localhost)
  /^10\./, // 10.0.0.0/8 (private)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 (private)
  /^192\.168\./, // 192.168.0.0/16 (private)
  /^169\.254\./, // 169.254.0.0/16 (link-local)
  /^0\./, // 0.0.0.0/8
];

const BLOCKED_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'];

export function validateUrl(urlString: string): URL {
  let url: URL;

  try {
    url = new URL(urlString);
  } catch {
    throw new UrlValidationError(`Invalid URL format: ${urlString}`);
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new UrlValidationError(
      `Invalid URL scheme: ${url.protocol}. Only http and https are allowed.`,
    );
  }

  return url;
}

export function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

export function isBlockedHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();
  return (
    BLOCKED_HOSTNAMES.includes(normalizedHostname) ||
    isPrivateIp(normalizedHostname)
  );
}

export function validateHostname(hostname: string): void {
  if (isBlockedHostname(hostname)) {
    throw new UrlValidationError(
      `Access to private/internal addresses is not allowed: ${hostname}`,
    );
  }
}
