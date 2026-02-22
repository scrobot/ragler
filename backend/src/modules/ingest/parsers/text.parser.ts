import { FileParser, FileParseResult } from './file-parser.interface';
import { extractFilenameTitle } from './utils';

const EXTENSION_MIME_MAP: Record<string, string> = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.csv': 'text/csv',
};

export class TextParser implements FileParser {
    readonly supportedExtensions = ['.txt', '.md', '.csv'];

    async parse(buffer: Buffer, filename: string): Promise<FileParseResult> {
        const content = buffer.toString('utf-8').trim();
        if (!content) {
            throw new Error(`Text file "${filename}" is empty`);
        }

        const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
        const mimeType = EXTENSION_MIME_MAP[extension] ?? 'text/plain';

        return {
            content,
            title: extractFilenameTitle(filename),
            metadata: {
                filename,
                fileSize: buffer.length,
                mimeType,
            },
        };
    }
}
