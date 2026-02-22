import { BadRequestException } from '@nestjs/common';
import { FileParser } from './file-parser.interface';
import { PdfParser } from './pdf.parser';
import { DocxParser } from './docx.parser';
import { TextParser } from './text.parser';

const PARSERS: FileParser[] = [
    new PdfParser(),
    new DocxParser(),
    new TextParser(),
];

const EXTENSION_MAP = new Map<string, FileParser>();
for (const parser of PARSERS) {
    for (const ext of parser.supportedExtensions) {
        EXTENSION_MAP.set(ext.toLowerCase(), parser);
    }
}

export const SUPPORTED_EXTENSIONS = [...EXTENSION_MAP.keys()];

export function resolveFileParser(filename: string): FileParser {
    const extension = filename
        .substring(filename.lastIndexOf('.'))
        .toLowerCase();

    const parser = EXTENSION_MAP.get(extension);
    if (!parser) {
        throw new BadRequestException(
            `Unsupported file type "${extension}". Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`,
        );
    }

    return parser;
}
