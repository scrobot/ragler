import { TextParser } from '@ingest/parsers/text.parser';

describe('TextParser', () => {
    const parser = new TextParser();

    it('should declare supported extensions', () => {
        expect(parser.supportedExtensions).toEqual(['.txt', '.md', '.csv']);
    });

    it('should parse .txt file content', async () => {
        const buffer = Buffer.from('Hello world\nThis is a test');
        const result = await parser.parse(buffer, 'readme.txt');

        expect(result.content).toBe('Hello world\nThis is a test');
        expect(result.title).toBe('readme');
        expect(result.metadata.filename).toBe('readme.txt');
        expect(result.metadata.mimeType).toBe('text/plain');
        expect(result.metadata.fileSize).toBe(buffer.length);
    });

    it('should parse .md file with correct MIME type', async () => {
        const buffer = Buffer.from('# Heading\n\nSome markdown content');
        const result = await parser.parse(buffer, 'docs.md');

        expect(result.content).toBe('# Heading\n\nSome markdown content');
        expect(result.metadata.mimeType).toBe('text/markdown');
    });

    it('should parse .csv file with correct MIME type', async () => {
        const buffer = Buffer.from('name,age\nAlice,30\nBob,25');
        const result = await parser.parse(buffer, 'data.csv');

        expect(result.content).toBe('name,age\nAlice,30\nBob,25');
        expect(result.metadata.mimeType).toBe('text/csv');
    });

    it('should throw error for empty file', async () => {
        const buffer = Buffer.from('');
        await expect(parser.parse(buffer, 'empty.txt')).rejects.toThrow(
            'Text file "empty.txt" is empty',
        );
    });

    it('should throw error for whitespace-only file', async () => {
        const buffer = Buffer.from('   \n\t  ');
        await expect(parser.parse(buffer, 'blank.txt')).rejects.toThrow(
            'Text file "blank.txt" is empty',
        );
    });

    it('should trim leading and trailing whitespace', async () => {
        const buffer = Buffer.from('  \n  content  \n  ');
        const result = await parser.parse(buffer, 'spaced.txt');

        expect(result.content).toBe('content');
    });

    it('should extract title from filename without extension', async () => {
        const buffer = Buffer.from('content');
        const result = await parser.parse(buffer, 'my-document.notes.txt');

        expect(result.title).toBe('my-document.notes');
    });
});
