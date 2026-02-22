import { chunkByCharacter, ChunkingConfig } from '@llm/chunkers/character-chunker';

describe('chunkByCharacter', () => {
    describe('basic splitting', () => {
        it('should return empty array for empty string', () => {
            const result = chunkByCharacter('');
            expect(result).toEqual([]);
        });

        it('should return empty array for whitespace-only string', () => {
            const result = chunkByCharacter('   \n\n  ');
            expect(result).toEqual([]);
        });

        it('should return single chunk for text shorter than chunk size', () => {
            const result = chunkByCharacter('Short text', { chunkSize: 1000 });
            expect(result).toHaveLength(1);
            expect(result[0].text).toBe('Short text');
            expect(result[0].isDirty).toBe(false);
        });

        it('should generate unique IDs for each chunk', () => {
            const text = 'a'.repeat(500);
            const result = chunkByCharacter(text, { chunkSize: 100, overlap: 0 });
            const ids = result.map((c) => c.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });
    });

    describe('splitting behavior', () => {
        it('should split text into multiple chunks', () => {
            const text = 'Word '.repeat(300); // ~1500 chars
            const result = chunkByCharacter(text, { chunkSize: 500, overlap: 0 });
            expect(result.length).toBeGreaterThan(1);
        });

        it('should prefer paragraph breaks as split points', () => {
            const paragraph1 = 'First paragraph content here.';
            const paragraph2 = 'Second paragraph content here.';
            const text = `${paragraph1}\n\n${paragraph2}`;

            const result = chunkByCharacter(text, {
                chunkSize: paragraph1.length + 5, // Just past the paragraph break
                overlap: 0,
            });

            expect(result.length).toBe(2);
            expect(result[0].text).toBe(paragraph1);
            expect(result[1].text).toBe(paragraph2);
        });

        it('should prefer sentence endings as split points', () => {
            const sentence1 = 'First sentence here.';
            const sentence2 = 'Second sentence here.';
            const text = `${sentence1} ${sentence2}`;

            const result = chunkByCharacter(text, {
                chunkSize: sentence1.length + 5,
                overlap: 0,
            });

            expect(result.length).toBe(2);
            expect(result[0].text).toContain('First sentence');
        });
    });

    describe('overlap behavior', () => {
        it('should apply overlap between chunks', () => {
            // Create text with clear boundaries
            const lines = Array.from({ length: 20 }, (_, i) => `Line ${i + 1} text.`);
            const text = lines.join('\n');

            const withoutOverlap = chunkByCharacter(text, { chunkSize: 100, overlap: 0 });
            const withOverlap = chunkByCharacter(text, { chunkSize: 100, overlap: 50 });

            // With overlap should produce more chunks
            expect(withOverlap.length).toBeGreaterThanOrEqual(withoutOverlap.length);
        });

        it('should produce valid chunks even with large overlap', () => {
            const text = 'Word '.repeat(100);
            const result = chunkByCharacter(text, { chunkSize: 200, overlap: 150 });

            // All chunks should be non-empty
            for (const chunk of result) {
                expect(chunk.text.trim().length).toBeGreaterThan(0);
            }
        });
    });

    describe('edge cases', () => {
        it('should handle text equal to chunk size', () => {
            const text = 'a'.repeat(100);
            const result = chunkByCharacter(text, { chunkSize: 100, overlap: 0 });
            expect(result).toHaveLength(1);
            expect(result[0].text).toBe(text);
        });

        it('should handle single character text', () => {
            const result = chunkByCharacter('x');
            expect(result).toHaveLength(1);
            expect(result[0].text).toBe('x');
        });

        it('should handle text with no word boundaries', () => {
            const text = 'a'.repeat(500);
            const result = chunkByCharacter(text, { chunkSize: 200, overlap: 0 });
            expect(result.length).toBeGreaterThan(1);
            // All content should be preserved
            const combined = result.map((c) => c.text).join('');
            expect(combined.length).toBe(500);
        });

        it('should use default config when not provided', () => {
            const text = 'a'.repeat(500);
            const result = chunkByCharacter(text);
            // Default chunk size is 1000, so 500 chars should be single chunk
            expect(result).toHaveLength(1);
        });

        it('should always make forward progress', () => {
            const text = 'a'.repeat(2000);
            const result = chunkByCharacter(text, { chunkSize: 100, overlap: 90 });
            // Should finish without infinite loop
            expect(result.length).toBeGreaterThan(0);
            expect(result.length).toBeLessThan(2000);
        });
    });
});
