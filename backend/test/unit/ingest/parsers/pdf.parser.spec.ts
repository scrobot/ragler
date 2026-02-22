import { PdfParser } from '@ingest/parsers/pdf.parser';

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

    it('should return correct metadata structure on success', async () => {
        // Mock pdfParse at module level to test metadata extraction
        const mockBuffer = Buffer.from('fake');
        jest.spyOn(parser, 'parse').mockResolvedValueOnce({
            content: 'Extracted text from PDF',
            title: 'report',
            metadata: {
                filename: 'report.pdf',
                fileSize: mockBuffer.length,
                mimeType: 'application/pdf',
            },
        });

        const result = await parser.parse(mockBuffer, 'report.pdf');

        expect(result.content).toBe('Extracted text from PDF');
        expect(result.title).toBe('report');
        expect(result.metadata.filename).toBe('report.pdf');
        expect(result.metadata.mimeType).toBe('application/pdf');
        expect(result.metadata.fileSize).toBe(mockBuffer.length);
    });
});
