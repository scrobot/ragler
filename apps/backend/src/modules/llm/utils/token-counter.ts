import { encoding_for_model } from 'tiktoken';

/**
 * Token counting utilities for OpenAI models
 *
 * Uses tiktoken for accurate token counting compatible with:
 * - GPT-4o, GPT-4o-mini
 * - text-embedding-3-small
 */

// Cache encoding instance (expensive to create)
let encodingInstance: ReturnType<typeof encoding_for_model> | null = null;

/**
 * Get tiktoken encoding instance (cached)
 */
function getEncoding() {
  if (!encodingInstance) {
    // Use gpt-4o encoding (same as gpt-4o-mini and text-embedding-3-small)
    encodingInstance = encoding_for_model('gpt-4o');
  }
  return encodingInstance;
}

/**
 * Count tokens in text using tiktoken
 *
 * @param text - Input text
 * @returns Token count
 */
export function countTokens(text: string): number {
  if (!text) {
    return 0;
  }

  const encoding = getEncoding();
  const tokens = encoding.encode(text);
  return tokens.length;
}

/**
 * Estimate token count quickly without tiktoken (for performance)
 *
 * Heuristic: ~4 characters per token for English, ~2.5 for Russian
 * Useful for quick estimates when exact count isn't critical
 *
 * @param text - Input text
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  if (!text) {
    return 0;
  }

  // Detect if text has Cyrillic characters
  const hasCyrillic = /[\u0400-\u04FF]/.test(text);

  // Russian text typically uses fewer characters per token
  const charsPerToken = hasCyrillic ? 2.5 : 4;

  return Math.ceil(text.length / charsPerToken);
}

/**
 * Split text at semantic boundaries while respecting token limits
 *
 * Splits on:
 * 1. Double newlines (paragraphs)
 * 2. Single newlines (lines)
 * 3. Sentence boundaries (. ! ?)
 * 4. Hard split if no boundaries found
 *
 * @param text - Input text
 * @param targetTokens - Target chunk size (soft limit)
 * @param maxTokens - Maximum chunk size (hard limit)
 * @returns Array of text chunks
 */
export function splitOnBoundaries(
  text: string,
  targetTokens: number = 400,
  maxTokens: number = 700
): string[] {
  if (countTokens(text) <= targetTokens) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const tokens = countTokens(remaining);

    if (tokens <= targetTokens) {
      chunks.push(remaining.trim());
      break;
    }

    // Try to split at semantic boundaries
    let splitPoint = findSplitPoint(remaining, targetTokens, maxTokens);

    if (splitPoint === -1) {
      // No good boundary found, force split at maxTokens
      splitPoint = findHardSplitPoint(remaining, maxTokens);
    }

    const chunk = remaining.substring(0, splitPoint).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    remaining = remaining.substring(splitPoint).trim();
  }

  return chunks;
}

/**
 * Find optimal split point at semantic boundary
 *
 * Priority:
 * 1. Double newline (paragraph break)
 * 2. Single newline (line break)
 * 3. Sentence boundary (. ! ?)
 *
 * @returns Character index to split at, or -1 if no boundary found
 */
function findSplitPoint(
  text: string,
  targetTokens: number,
  maxTokens: number
): number {
  // Estimate character position for target tokens
  const targetChars = Math.floor(targetTokens * 3.5);
  const maxChars = Math.floor(maxTokens * 3.5);

  const searchStart = Math.min(targetChars - 200, text.length);
  const searchEnd = Math.min(maxChars, text.length);
  const searchWindow = text.substring(searchStart, searchEnd);

  // Try paragraph break (double newline)
  const paragraphMatch = searchWindow.match(/\n\n/);
  if (paragraphMatch && paragraphMatch.index !== undefined) {
    const splitPoint = searchStart + paragraphMatch.index + 2;
    if (countTokens(text.substring(0, splitPoint)) <= maxTokens) {
      return splitPoint;
    }
  }

  // Try line break
  const lineMatch = searchWindow.match(/\n/);
  if (lineMatch && lineMatch.index !== undefined) {
    const splitPoint = searchStart + lineMatch.index + 1;
    if (countTokens(text.substring(0, splitPoint)) <= maxTokens) {
      return splitPoint;
    }
  }

  // Try sentence boundary
  const sentenceMatch = searchWindow.match(/[.!?]\s+/);
  if (sentenceMatch && sentenceMatch.index !== undefined) {
    const splitPoint =
      searchStart + sentenceMatch.index + sentenceMatch[0].length;
    if (countTokens(text.substring(0, splitPoint)) <= maxTokens) {
      return splitPoint;
    }
  }

  return -1; // No good boundary found
}

/**
 * Force split at maxTokens boundary (last resort)
 */
function findHardSplitPoint(text: string, maxTokens: number): number {
  // Binary search for split point
  let left = 0;
  let right = text.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const tokens = countTokens(text.substring(0, mid));

    if (tokens <= maxTokens) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return Math.max(1, left - 1); // Ensure we make progress
}

/**
 * Cleanup tiktoken encoding on shutdown
 */
export function cleanupTokenCounter() {
  if (encodingInstance) {
    encodingInstance.free();
    encodingInstance = null;
  }
}
