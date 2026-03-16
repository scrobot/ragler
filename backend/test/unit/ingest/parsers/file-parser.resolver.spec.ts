import { BadRequestException } from '@nestjs/common';
import { resolveFileParser, SUPPORTED_EXTENSIONS } from '@ingest/parsers/file-parser.resolver';
import { PdfParser } from '@ingest/parsers/pdf.parser';
import { DocxParser } from '@ingest/parsers/docx.parser';
import { TextParser } from '@ingest/parsers/text.parser';
import { HtmlParser } from '@ingest/parsers/html.parser';

describe('FileParserResolver', () => {
    describe('resolveFileParser', () => {
        it('should resolve .pdf to PdfParser', () => {
            const parser = resolveFileParser('document.pdf');
            expect(parser).toBeInstanceOf(PdfParser);
        });

        it('should resolve .docx to DocxParser', () => {
            const parser = resolveFileParser('report.docx');
            expect(parser).toBeInstanceOf(DocxParser);
        });

        it('should resolve .doc to DocxParser', () => {
            const parser = resolveFileParser('legacy.doc');
            expect(parser).toBeInstanceOf(DocxParser);
        });

        it('should resolve .txt to TextParser', () => {
            const parser = resolveFileParser('notes.txt');
            expect(parser).toBeInstanceOf(TextParser);
        });

        it('should resolve .md to TextParser', () => {
            const parser = resolveFileParser('readme.md');
            expect(parser).toBeInstanceOf(TextParser);
        });

        it('should resolve .csv to TextParser', () => {
            const parser = resolveFileParser('data.csv');
            expect(parser).toBeInstanceOf(TextParser);
        });

        it('should resolve .html to HtmlParser', () => {
            const parser = resolveFileParser('page.html');
            expect(parser).toBeInstanceOf(HtmlParser);
        });

        it('should resolve .htm to HtmlParser', () => {
            const parser = resolveFileParser('page.htm');
            expect(parser).toBeInstanceOf(HtmlParser);
        });

        it('should resolve .xhtml to HtmlParser', () => {
            const parser = resolveFileParser('page.xhtml');
            expect(parser).toBeInstanceOf(HtmlParser);
        });

        it('should handle case-insensitive extensions', () => {
            const parser = resolveFileParser('DOCUMENT.PDF');
            expect(parser).toBeInstanceOf(PdfParser);
        });

        it('should throw BadRequestException for .exe', () => {
            expect(() => resolveFileParser('virus.exe')).toThrow(BadRequestException);
            expect(() => resolveFileParser('virus.exe')).toThrow('Unsupported file type');
        });

        it('should throw BadRequestException for .zip', () => {
            expect(() => resolveFileParser('archive.zip')).toThrow(BadRequestException);
        });

        it('should throw BadRequestException for unknown extension', () => {
            expect(() => resolveFileParser('file.xyz')).toThrow(BadRequestException);
        });

        it('should throw for file with no extension', () => {
            expect(() => resolveFileParser('Makefile')).toThrow(BadRequestException);
        });
    });

    describe('SUPPORTED_EXTENSIONS', () => {
        it('should include all expected extensions', () => {
            expect(SUPPORTED_EXTENSIONS).toContain('.pdf');
            expect(SUPPORTED_EXTENSIONS).toContain('.docx');
            expect(SUPPORTED_EXTENSIONS).toContain('.doc');
            expect(SUPPORTED_EXTENSIONS).toContain('.txt');
            expect(SUPPORTED_EXTENSIONS).toContain('.md');
            expect(SUPPORTED_EXTENSIONS).toContain('.csv');
            expect(SUPPORTED_EXTENSIONS).toContain('.html');
            expect(SUPPORTED_EXTENSIONS).toContain('.htm');
            expect(SUPPORTED_EXTENSIONS).toContain('.xhtml');
        });

        it('should have exactly 9 supported extensions', () => {
            expect(SUPPORTED_EXTENSIONS).toHaveLength(9);
        });
    });
});
