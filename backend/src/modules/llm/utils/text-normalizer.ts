import * as crypto from 'crypto';

/**
 * Text normalization utilities for consistent hashing and comparison
 */

/**
 * Normalize text for content hashing
 *
 * Steps:
 * 1. Trim whitespace
 * 2. Collapse multiple spaces to single space
 * 3. Collapse 3+ newlines to 2 newlines
 * 4. Remove leading emojis (for hash only, not display)
 * 5. Lowercase for case-insensitive comparison
 *
 * @param text - Input text
 * @returns Normalized text
 */
export function normalizeForHash(text: string): string {
  let normalized = text;

  // Trim
  normalized = normalized.trim();

  // Collapse multiple spaces
  normalized = normalized.replace(/  +/g, ' ');

  // Collapse multiple newlines (3+ → 2)
  normalized = normalized.replace(/\n{3,}/g, '\n\n');

  // Remove leading emojis (common in Confluence: 📋, 🗺️, 🎯, etc.)
  // Unicode ranges for emojis
  normalized = normalized.replace(
    /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+\s*/u,
    ''
  );

  // Lowercase for case-insensitive hashing
  normalized = normalized.toLowerCase();

  return normalized;
}

/**
 * Compute SHA-256 hash of text
 *
 * @param text - Input text (will be normalized first)
 * @returns Hash in format "sha256:..." (lowercase hex)
 */
export function computeContentHash(text: string): string {
  const normalized = normalizeForHash(text);

  const hash = crypto
    .createHash('sha256')
    .update(normalized, 'utf8')
    .digest('hex');

  return `sha256:${hash}`;
}

/**
 * Detect language based on Cyrillic presence
 *
 * Heuristic:
 * - If >10% Cyrillic characters → 'ru'
 * - If >90% Latin → 'en'
 * - Otherwise → 'mixed'
 *
 * @param text - Input text
 * @returns Language code
 */
export function detectLanguage(text: string): 'ru' | 'en' | 'mixed' {
  if (!text || text.length === 0) {
    return 'en'; // Default
  }

  // Count Cyrillic and Latin letters
  const cyrillicMatches = text.match(/[\u0400-\u04FF]/g);
  const latinMatches = text.match(/[a-zA-Z]/g);

  const cyrillicCount = cyrillicMatches ? cyrillicMatches.length : 0;
  const latinCount = latinMatches ? latinMatches.length : 0;

  const totalLetters = cyrillicCount + latinCount;

  if (totalLetters === 0) {
    return 'en'; // No letters, default to English
  }

  const cyrillicRatio = cyrillicCount / totalLetters;

  if (cyrillicRatio > 0.1) {
    return 'ru'; // Significant Cyrillic presence
  }

  if (cyrillicRatio === 0 && latinCount / text.length > 0.3) {
    return 'en'; // Mostly Latin letters
  }

  return 'mixed';
}

/**
 * Normalize tag string to lowercase kebab-case
 *
 * Examples:
 * - "RAG System" → "rag-system"
 * - "Claude Code" → "claude-code"
 * - "LangChain" → "langchain"
 *
 * @param tag - Input tag
 * @returns Normalized tag
 */
export function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove non-alphanumeric except hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}
