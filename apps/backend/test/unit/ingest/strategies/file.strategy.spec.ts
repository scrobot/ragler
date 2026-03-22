import { BadRequestException } from '@nestjs/common';
import { FileStrategy } from '@ingest/strategies/file.strategy';

describe('FileStrategy', () => {
    const strategy = new FileStrategy();

    it('should have sourceType set to file', () => {
        expect(strategy.sourceType).toBe('file');
    });

    it('should parse text file content from base64 input', async () => {
        const content = 'Hello, this is a test file content.';
        const input = JSON.stringify({
            buffer: Buffer.from(content).toString('base64'),
            filename: 'readme.txt',
            fileSize: content.length,
            mimeType: 'text/plain',
        });

        const result = await strategy.ingest(input);

        expect(result.content).toBe(content);
        expect(result.title).toBe('readme');
        expect(result.sourceUrl).toBe('file://readme.txt');
        expect(result.metadata.filename).toBe('readme.txt');
        expect(result.metadata.fileSize).toBe(content.length);
        expect(result.metadata.mimeType).toBe('text/plain');
    });

    it('should parse markdown file content', async () => {
        const content = '# Title\n\nSome markdown content';
        const input = JSON.stringify({
            buffer: Buffer.from(content).toString('base64'),
            filename: 'docs.md',
            fileSize: content.length,
            mimeType: 'text/markdown',
        });

        const result = await strategy.ingest(input);

        expect(result.content).toBe(content);
        expect(result.metadata.mimeType).toBe('text/markdown');
    });

    it('should throw BadRequestException for invalid JSON input', async () => {
        await expect(strategy.ingest('not json')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing filename', async () => {
        const input = JSON.stringify({
            buffer: Buffer.from('content').toString('base64'),
            fileSize: 7,
            mimeType: 'text/plain',
        });

        await expect(strategy.ingest(input)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing buffer', async () => {
        const input = JSON.stringify({
            filename: 'test.txt',
            fileSize: 0,
            mimeType: 'text/plain',
        });

        await expect(strategy.ingest(input)).rejects.toThrow(BadRequestException);
    });

    it('should throw for unsupported file extension', async () => {
        const input = JSON.stringify({
            buffer: Buffer.from('content').toString('base64'),
            filename: 'virus.exe',
            fileSize: 7,
            mimeType: 'application/x-executable',
        });

        await expect(strategy.ingest(input)).rejects.toThrow(BadRequestException);
    });
});
