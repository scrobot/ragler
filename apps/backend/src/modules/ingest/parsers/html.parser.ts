import * as cheerio from 'cheerio';
import { FileParser, FileParseResult } from './file-parser.interface';
import { extractFilenameTitle } from './utils';

const EXTENSION_MIME_MAP: Record<string, string> = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.xhtml': 'application/xhtml+xml',
};

/** Confluence storage format namespace prefixes to unwrap (keep inner text) */
const CONFLUENCE_TAGS = [
    'ac\\:structured-macro',
    'ac\\:rich-text-body',
    'ac\\:plain-text-body',
    'ac\\:parameter',
    'ac\\:link',
    'ac\\:image',
    'ri\\:attachment',
    'ri\\:url',
    'ri\\:page',
];

export class HtmlParser implements FileParser {
    readonly supportedExtensions = ['.html', '.htm', '.xhtml'];

    async parse(buffer: Buffer, filename: string): Promise<FileParseResult> {
        const html = buffer.toString('utf-8');
        const $ = cheerio.load(html, { xmlMode: false });

        // Strip <script> and <style> completely
        $('script, style').remove();

        // Unwrap Confluence macro tags — keep inner text, remove wrapper elements
        for (const tag of CONFLUENCE_TAGS) {
            $(tag).each((_i, el) => {
                $(el).replaceWith($(el).html() ?? '');
            });
        }

        // Extract title from <title> tag, fall back to filename
        const titleTag = $('title').text().trim();
        const title = titleTag || extractFilenameTitle(filename);

        // Replace <img> with alt/title text placeholder
        $('img').each((_i, el) => {
            const alt = $(el).attr('alt')?.trim();
            const imgTitle = $(el).attr('title')?.trim();
            const label = alt || imgTitle;
            if (label) {
                $(el).replaceWith(`[Image: ${label}]`);
            } else {
                $(el).remove();
            }
        });

        // Collect <iframe> src URLs
        const iframeSources: string[] = [];
        $('iframe').each((_i, el) => {
            const src = $(el).attr('src')?.trim();
            if (src) {
                iframeSources.push(src);
            }
            $(el).remove();
        });

        // Convert headings to markdown-style
        for (let level = 1; level <= 6; level++) {
            $(`h${level}`).each((_i, el) => {
                const text = $(el).text().trim();
                if (text) {
                    const prefix = '#'.repeat(level);
                    $(el).replaceWith(`\n${prefix} ${text}\n`);
                }
            });
        }

        // Convert list items to bullet format
        $('li').each((_i, el) => {
            const text = $(el).text().trim();
            if (text) {
                $(el).replaceWith(`\n- ${text}`);
            }
        });

        // Convert table rows to pipe-delimited text
        $('tr').each((_i, el) => {
            const cells: string[] = [];
            $(el)
                .find('td, th')
                .each((_j, cell) => {
                    cells.push($(cell).text().trim());
                });
            if (cells.length > 0) {
                $(el).replaceWith(`\n| ${cells.join(' | ')} |`);
            }
        });

        // Extract final text content
        let content = $('body').text();

        // Append iframe sources as metadata
        if (iframeSources.length > 0) {
            content += '\n\nEmbedded sources:\n' + iframeSources.map((src) => `- ${src}`).join('\n');
        }

        // Normalise whitespace: collapse multiple blank lines, trim
        content = content
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        if (!content) {
            throw new Error(`HTML file "${filename}" contains no extractable text`);
        }

        const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
        const mimeType = EXTENSION_MIME_MAP[extension] ?? 'text/html';

        return {
            content,
            title,
            metadata: {
                filename,
                fileSize: buffer.length,
                mimeType,
            },
        };
    }
}
