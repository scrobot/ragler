import { Injectable, BadRequestException } from '@nestjs/common';
import { IngestStrategy, IngestResult } from './ingest.strategy';
import { SourceType } from '@ingest/dto';
import { resolveFileParser } from '../parsers';

interface FileInput {
    buffer: string; // base64-encoded
    filename: string;
    fileSize: number;
    mimeType: string;
}

@Injectable()
export class FileStrategy implements IngestStrategy {
    readonly sourceType: SourceType = 'file';

    async ingest(input: string): Promise<IngestResult> {
        let fileInput: FileInput;
        try {
            fileInput = JSON.parse(input);
        } catch {
            throw new BadRequestException('Invalid file input payload');
        }

        if (!fileInput.filename) {
            throw new BadRequestException('Filename is required');
        }

        if (!fileInput.buffer) {
            throw new BadRequestException('File buffer is required');
        }

        const buffer = Buffer.from(fileInput.buffer, 'base64');
        const parser = resolveFileParser(fileInput.filename);
        const result = await parser.parse(buffer, fileInput.filename);

        return {
            content: result.content,
            title: result.title,
            sourceUrl: `file://${fileInput.filename}`,
            metadata: {
                filename: result.metadata.filename,
                fileSize: result.metadata.fileSize,
                mimeType: result.metadata.mimeType,
            },
        };
    }
}
