// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
import { FileParser, FileParseResult } from './file-parser.interface';
import { extractFilenameTitle } from './utils';

export class PdfParser implements FileParser {
    readonly supportedExtensions = ['.pdf'];

    async parse(buffer: Buffer, filename: string): Promise<FileParseResult> {
        const result = await pdfParse(buffer);

        const content = result.text.trim();
        if (!content) {
            throw new Error(`PDF file "${filename}" contains no extractable text`);
        }

        return {
            content,
            title: extractFilenameTitle(filename),
            metadata: {
                filename,
                fileSize: buffer.length,
                mimeType: 'application/pdf',
            },
        };
    }
}
