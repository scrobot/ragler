import { readFileSync } from 'fs';
import { join } from 'path';
import { PdfParser } from '@ingest/parsers/pdf.parser';

const FIXTURES_DIR = join(__dirname, '../../../resources');

describe('PdfParser', () => {
    const parser = new PdfParser();

    it('should declare supported extensions', () => {
        expect(parser.supportedExtensions).toEqual(['.pdf']);
    });

    // pdf-parse requires a real PDF with proper xref table
    // We test the error path and metadata extraction instead
    it('should throw error for non-PDF buffer', async () => {
        const buffer = Buffer.from('this is not a pdf');
        await expect(parser.parse(buffer, 'bad.pdf')).rejects.toThrow();
    });

    it('should throw error for empty buffer', async () => {
        const buffer = Buffer.alloc(0);
        await expect(parser.parse(buffer, 'empty.pdf')).rejects.toThrow();
    });

    describe('real-world fixture: AI Agents Theory and Tools (1.5MB)', () => {
        const FIXTURE_FILENAME = 'AI Agents Theory and Tools.pdf';

        let buffer: Buffer;
        let result: Awaited<ReturnType<PdfParser['parse']>>;

        beforeAll(async () => {
            buffer = readFileSync(join(FIXTURES_DIR, FIXTURE_FILENAME));
            result = await parser.parse(buffer, FIXTURE_FILENAME);
        });

        it('should extract meaningful text content', () => {
            expect(result.content.length).toBeGreaterThan(1000);
        });

        it('should extract title from filename', () => {
            expect(result.title).toBe('AI Agents Theory and Tools');
        });

        it('should return correct metadata', () => {
            expect(result.metadata.filename).toBe(FIXTURE_FILENAME);
            expect(result.metadata.fileSize).toBe(buffer.length);
            expect(result.metadata.mimeType).toBe('application/pdf');
        });

        it('should parse within 5 seconds', async () => {
            const start = Date.now();
            await parser.parse(buffer, FIXTURE_FILENAME);
            const elapsed = Date.now() - start;

            expect(elapsed).toBeLessThan(5000);
        });
    });
});
