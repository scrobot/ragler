import { v4 as uuidv4 } from 'uuid';

export interface ChunkingConfig {
    method: 'llm' | 'character';
    chunkSize: number;
    overlap: number;
}

export interface CharacterChunk {
    id: string;
    text: string;
    isDirty: boolean;
}

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP = 200;

/**
 * Split text into chunks on paragraph or sentence boundaries
 * near the target chunk size, with configurable overlap.
 */
export function chunkByCharacter(
    content: string,
    config: Partial<ChunkingConfig> = {},
): CharacterChunk[] {
    const chunkSize = config.chunkSize ?? DEFAULT_CHUNK_SIZE;
    const overlap = config.overlap ?? DEFAULT_OVERLAP;
    const trimmed = content.trim();

    if (!trimmed) {
        return [];
    }

    if (trimmed.length <= chunkSize) {
        return [{ id: `chunk_${uuidv4()}`, text: trimmed, isDirty: false }];
    }

    const chunks: CharacterChunk[] = [];
    let start = 0;

    while (start < trimmed.length) {
        let end = Math.min(start + chunkSize, trimmed.length);

        // If not at the end of text, find the best split point
        if (end < trimmed.length) {
            end = findBestSplitPoint(trimmed, start, end);
        }

        const chunkText = trimmed.slice(start, end).trim();
        if (chunkText) {
            chunks.push({
                id: `chunk_${uuidv4()}`,
                text: chunkText,
                isDirty: false,
            });
        }

        // Move start forward, accounting for overlap
        const advance = end - start - overlap;
        start += Math.max(advance, 1); // Ensure forward progress
    }

    return chunks;
}

/**
 * Find the best boundary to split text near the target end position.
 * Prefers paragraph breaks (\n\n), then line breaks (\n), then sentence endings (.!?),
 * then any whitespace. Falls back to the hard limit if no boundary is found.
 */
function findBestSplitPoint(
    text: string,
    start: number,
    targetEnd: number,
): number {
    // Search window: from 70% of chunk size to targetEnd
    const searchStart = start + Math.floor((targetEnd - start) * 0.7);
    const window = text.slice(searchStart, targetEnd);

    // Priority 1: Paragraph break (\n\n)
    const paragraphIdx = window.lastIndexOf('\n\n');
    if (paragraphIdx >= 0) {
        return searchStart + paragraphIdx + 2; // After the double newline
    }

    // Priority 2: Line break (\n)
    const lineBreakIdx = window.lastIndexOf('\n');
    if (lineBreakIdx >= 0) {
        return searchStart + lineBreakIdx + 1;
    }

    // Priority 3: Sentence ending (. ! ?)
    const sentenceMatch = findLastSentenceEnd(window);
    if (sentenceMatch >= 0) {
        return searchStart + sentenceMatch + 1;
    }

    // Priority 4: Any whitespace
    const spaceIdx = window.lastIndexOf(' ');
    if (spaceIdx >= 0) {
        return searchStart + spaceIdx + 1;
    }

    // Fallback: hard split at target end
    return targetEnd;
}

/**
 * Find the last sentence-ending punctuation followed by whitespace in a string.
 */
function findLastSentenceEnd(text: string): number {
    for (let i = text.length - 1; i >= 0; i--) {
        if (
            (text[i] === '.' || text[i] === '!' || text[i] === '?') &&
            i + 1 < text.length &&
            /\s/.test(text[i + 1])
        ) {
            return i + 1; // Position after the punctuation + space
        }
    }
    return -1;
}
