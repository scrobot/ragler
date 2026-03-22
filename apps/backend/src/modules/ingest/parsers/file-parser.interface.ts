export interface FileParseResult {
    content: string;
    title: string;
    metadata: {
        filename: string;
        fileSize: number;
        mimeType: string;
    };
}

export interface FileParser {
    readonly supportedExtensions: string[];
    parse(buffer: Buffer, filename: string): Promise<FileParseResult>;
}
