import { readFileSync } from 'fs';
import { join } from 'path';
import { HtmlParser } from '@ingest/parsers/html.parser';

const FIXTURES_DIR = join(__dirname, '../../../resources');

describe('HtmlParser', () => {
    const parser = new HtmlParser();

    it('should declare supported extensions', () => {
        expect(parser.supportedExtensions).toEqual(['.html', '.htm', '.xhtml']);
    });

    it('should extract plain text from basic HTML', async () => {
        const html = '<html><body><p>Hello world</p></body></html>';
        const result = await parser.parse(Buffer.from(html), 'page.html');

        expect(result.content).toContain('Hello world');
        expect(result.metadata.mimeType).toBe('text/html');
        expect(result.metadata.filename).toBe('page.html');
        expect(result.metadata.fileSize).toBe(Buffer.from(html).length);
    });

    it('should extract <title> as document title', async () => {
        const html = '<html><head><title>My Page Title</title></head><body><p>content</p></body></html>';
        const result = await parser.parse(Buffer.from(html), 'page.html');

        expect(result.title).toBe('My Page Title');
    });

    it('should fall back to filename when no <title>', async () => {
        const html = '<html><body><p>content</p></body></html>';
        const result = await parser.parse(Buffer.from(html), 'my-document.html');

        expect(result.title).toBe('my-document');
    });

    it('should convert headings to markdown-style', async () => {
        const html = '<html><body><h1>Title</h1><h2>Subtitle</h2><h3>Section</h3></body></html>';
        const result = await parser.parse(Buffer.from(html), 'page.html');

        expect(result.content).toContain('# Title');
        expect(result.content).toContain('## Subtitle');
        expect(result.content).toContain('### Section');
    });

    it('should convert list items to bullet format', async () => {
        const html = '<html><body><ul><li>Alpha</li><li>Beta</li></ul></body></html>';
        const result = await parser.parse(Buffer.from(html), 'page.html');

        expect(result.content).toContain('- Alpha');
        expect(result.content).toContain('- Beta');
    });

    it('should convert table rows to pipe-delimited text', async () => {
        const html = `<html><body>
            <table>
                <tr><th>Name</th><th>Age</th></tr>
                <tr><td>Alice</td><td>30</td></tr>
            </table>
        </body></html>`;
        const result = await parser.parse(Buffer.from(html), 'page.html');

        expect(result.content).toContain('| Name | Age |');
        expect(result.content).toContain('| Alice | 30 |');
    });

    it('should strip <script> and <style> completely', async () => {
        const html = `<html><body>
            <style>body { color: red; }</style>
            <script>alert("xss")</script>
            <p>Visible text</p>
        </body></html>`;
        const result = await parser.parse(Buffer.from(html), 'page.html');

        expect(result.content).toContain('Visible text');
        expect(result.content).not.toContain('color: red');
        expect(result.content).not.toContain('alert');
    });

    it('should replace <img> with alt text', async () => {
        const html = '<html><body><img alt="Logo image" /><p>text</p></body></html>';
        const result = await parser.parse(Buffer.from(html), 'page.html');

        expect(result.content).toContain('[Image: Logo image]');
    });

    it('should replace <img> with title when no alt', async () => {
        const html = '<html><body><img title="Chart" /><p>text</p></body></html>';
        const result = await parser.parse(Buffer.from(html), 'page.html');

        expect(result.content).toContain('[Image: Chart]');
    });

    it('should remove <img> without alt or title', async () => {
        const html = '<html><body><img src="logo.png" /><p>text</p></body></html>';
        const result = await parser.parse(Buffer.from(html), 'page.html');

        expect(result.content).not.toContain('logo.png');
    });

    it('should collect <iframe> src URLs', async () => {
        const html = `<html><body>
            <iframe src="https://example.com/embed"></iframe>
            <p>Main content</p>
        </body></html>`;
        const result = await parser.parse(Buffer.from(html), 'page.html');

        expect(result.content).toContain('Embedded sources:');
        expect(result.content).toContain('- https://example.com/embed');
    });

    it('should strip Confluence macros but preserve inner text', async () => {
        const html = `<html><body>
            <ac:structured-macro ac:name="info">
                <ac:rich-text-body>
                    <p>Important info inside macro</p>
                </ac:rich-text-body>
            </ac:structured-macro>
        </body></html>`;
        const result = await parser.parse(Buffer.from(html), 'page.html');

        expect(result.content).toContain('Important info inside macro');
        expect(result.content).not.toContain('ac:structured-macro');
        expect(result.content).not.toContain('ac:rich-text-body');
    });

    it('should throw error for empty HTML', async () => {
        const html = '<html><body></body></html>';
        await expect(parser.parse(Buffer.from(html), 'empty.html')).rejects.toThrow(
            'HTML file "empty.html" contains no extractable text',
        );
    });

    it('should throw error for script-only HTML', async () => {
        const html = '<html><body><script>var x = 1;</script></body></html>';
        await expect(parser.parse(Buffer.from(html), 'script.html')).rejects.toThrow(
            'HTML file "script.html" contains no extractable text',
        );
    });

    it('should use text/html MIME type for .htm', async () => {
        const html = '<html><body><p>content</p></body></html>';
        const result = await parser.parse(Buffer.from(html), 'page.htm');

        expect(result.metadata.mimeType).toBe('text/html');
    });

    it('should use application/xhtml+xml MIME type for .xhtml', async () => {
        const html = '<html><body><p>content</p></body></html>';
        const result = await parser.parse(Buffer.from(html), 'page.xhtml');

        expect(result.metadata.mimeType).toBe('application/xhtml+xml');
    });

    it('should normalise excessive whitespace', async () => {
        const html = '<html><body><p>line one</p>\n\n\n\n\n<p>line two</p></body></html>';
        const result = await parser.parse(Buffer.from(html), 'page.html');

        // Should not have more than 2 consecutive newlines
        expect(result.content).not.toMatch(/\n{3,}/);
    });

    describe('real-world fixture: Times of Israel article (660KB)', () => {
        const FIXTURE_FILENAME =
            "Gamblers trying to win a bet on Polymarket are vowing to kill me if I don't rewrite an Iran missile story _ The Times of Israel.html";

        let buffer: Buffer;
        let result: Awaited<ReturnType<HtmlParser['parse']>>;

        beforeAll(async () => {
            buffer = readFileSync(join(FIXTURES_DIR, FIXTURE_FILENAME));
            result = await parser.parse(buffer, FIXTURE_FILENAME);
        });

        it('should extract the page title', () => {
            expect(result.title).toContain('Gamblers trying to win a bet on Polymarket');
        });

        it('should strip all 63 <script> tags', () => {
            expect(result.content).not.toMatch(/function\s*\(/);
            expect(result.content).not.toContain('window.__');
            expect(result.content).not.toContain('document.getElementById');
        });

        it('should strip all <style> tags', () => {
            expect(result.content).not.toContain('font-family');
            expect(result.content).not.toContain('background-color');
            expect(result.content).not.toMatch(/\{[^}]*:[^}]*\}/);
        });

        it('should preserve article headings as markdown', () => {
            expect(result.content).toMatch(/#{1,3}\s+.*saga begins/i);
            expect(result.content).toMatch(/#{1,3}\s+.*Polymarket connection/i);
            expect(result.content).toMatch(/#{1,3}\s+.*threats escalate/i);
        });

        it('should extract image alt text from the 205 images', () => {
            expect(result.content).toContain('[Image:');
        });

        it('should produce substantial content from 660KB page', () => {
            // Content should be significant but much smaller than raw HTML
            expect(result.content.length).toBeGreaterThan(1000);
            expect(result.content.length).toBeLessThan(buffer.length);
        });

        it('should not contain excessive whitespace', () => {
            expect(result.content).not.toMatch(/\n{3,}/);
        });

        it('should return correct metadata', () => {
            expect(result.metadata.filename).toBe(FIXTURE_FILENAME);
            expect(result.metadata.fileSize).toBe(buffer.length);
            expect(result.metadata.mimeType).toBe('text/html');
        });

        it('should parse within 2 seconds', async () => {
            const start = Date.now();
            await parser.parse(buffer, FIXTURE_FILENAME);
            const elapsed = Date.now() - start;

            expect(elapsed).toBeLessThan(2000);
        });
    });
});
