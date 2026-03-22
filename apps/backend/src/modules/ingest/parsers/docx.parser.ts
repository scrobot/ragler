import * as mammoth from 'mammoth';
import { FileParser, FileParseResult } from './file-parser.interface';
import { extractFilenameTitle } from './utils';

export class DocxParser implements FileParser {
    readonly supportedExtensions = ['.docx', '.doc'];

    async parse(buffer: Buffer, filename: string): Promise<FileParseResult> {
        const result = await mammoth.extractRawText({ buffer });

        const content = result.value.trim();
        if (!content) {
            throw new Error(`DOCX file "${filename}" contains no extractable text`);
        }

        return {
            content,
            title: extractFilenameTitle(filename),
            metadata: {
                filename,
                fileSize: buffer.length,
                mimeType: filename.endsWith('.doc')
                    ? 'application/msword'
                    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            },
        };
    }
}
