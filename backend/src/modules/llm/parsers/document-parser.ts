import { JSDOM } from 'jsdom';

/**
 * Document structure parser for Confluence storage XML and other formats
 *
 * Extracts:
 * - Heading hierarchy (h1-h6)
 * - Tables with headers and rows
 * - Code blocks
 * - Sections with nested children
 */

export interface DocumentStructure {
  title: string | null;
  sections: Section[];
  tables: Table[];
  codeBlocks: CodeBlock[];
}

export interface Section {
  level: number; // 1-6 (h1-h6)
  heading: string;
  content: string; // Text content of this section (excluding children)
  children: Section[]; // Nested subsections
  startIndex: number; // Character position in original text
  endIndex: number;
}

export interface Table {
  headers: string[];
  rows: string[][];
  caption: string | null;
  startIndex: number;
  endIndex: number;
}

export interface CodeBlock {
  language: string | null;
  code: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Parse Confluence storage format XML to extract document structure
 */
export class ConfluenceDocumentParser {
  /**
   * Parse Confluence storage XML
   *
   * @param storageXml - Confluence storage format XML
   * @returns Parsed document structure
   */
  parse(storageXml: string): DocumentStructure {
    // Remove Confluence macros that don't contribute to content
    const cleanedXml = this.removeNonContentMacros(storageXml);

    // Parse XML as DOM
    const dom = new JSDOM(cleanedXml);
    const document = dom.window.document;

    // Extract title (if present as h1 at start)
    const title = this.extractTitle(document);

    // Extract sections with heading hierarchy
    const sections = this.extractSections(document);

    // Extract tables
    const tables = this.extractTables(document);

    // Extract code blocks
    const codeBlocks = this.extractCodeBlocks(document);

    return {
      title,
      sections,
      tables,
      codeBlocks,
    };
  }

  /**
   * Remove Confluence macros that don't contribute to readable content
   */
  private removeNonContentMacros(xml: string): string {
    return xml
      // Remove attachments, images (keep alt text if present)
      .replace(/<ri:attachment[^>]*>[\s\S]*?<\/ri:attachment>/gi, '')
      // Remove user mentions (keep the username in plain text)
      .replace(/<ri:user[^>]*ri:username="([^"]*)"[^>]*\/>/gi, '@$1')
      // Remove page links metadata (keep link text)
      .replace(/<ri:page[^>]*\/>/gi, '')
      // Remove emoticons (replace with text representation)
      .replace(
        /<ac:emoticon ac:name="([^"]*)"[^>]*\/>/gi,
        (_, name) => `:${name}:`
      )
      // Remove status lozenges but keep text
      .replace(
        /<ac:structured-macro ac:name="status"[^>]*>[\s\S]*?<ac:parameter ac:name="title">([^<]*)<\/ac:parameter>[\s\S]*?<\/ac:structured-macro>/gi,
        '[STATUS: $1]'
      );
  }

  /**
   * Extract document title from first h1 or title tag
   */
  private extractTitle(document: Document): string | null {
    const h1 = document.querySelector('h1');
    if (h1) {
      return h1.textContent?.trim() || null;
    }

    const title = document.querySelector('title');
    if (title) {
      return title.textContent?.trim() || null;
    }

    return null;
  }

  /**
   * Extract sections with heading hierarchy
   */
  private extractSections(document: Document): Section[] {
    const sections: Section[] = [];
    const headingSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

    const headings = Array.from(
      document.querySelectorAll(headingSelectors.join(','))
    );

    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const level = parseInt(heading.tagName.substring(1), 10); // h1 → 1

      // Extract text content between this heading and the next
      const nextHeading = headings[i + 1] || null;
      const content = this.extractContentBetween(heading, nextHeading);

      sections.push({
        level,
        heading: heading.textContent?.trim() || '',
        content: content.trim(),
        children: [], // Will be populated in buildHierarchy
        startIndex: 0, // Will be updated with actual positions
        endIndex: 0,
      });
    }

    // Build hierarchy (nest children under parents)
    return this.buildHierarchy(sections);
  }

  /**
   * Extract text content between two DOM nodes
   */
  private extractContentBetween(
    startNode: Element,
    endNode: Element | null
  ): string {
    const walker = startNode.ownerDocument.createTreeWalker(
      startNode.parentElement || startNode.ownerDocument.body,
      1, // NodeFilter.SHOW_ELEMENT
      null
    );

    let collecting = false;
    const contentParts: string[] = [];

    let currentNode = walker.currentNode as Element;

    while (currentNode) {
      if (currentNode === startNode) {
        collecting = true;
        currentNode = walker.nextNode() as Element;
        continue;
      }

      if (currentNode === endNode) {
        break;
      }

      if (collecting) {
        // Skip nested headings
        if (
          !currentNode.tagName.match(/^H[1-6]$/) &&
          currentNode.textContent
        ) {
          contentParts.push(currentNode.textContent);
        }
      }

      currentNode = walker.nextNode() as Element;
    }

    return contentParts.join(' ');
  }

  /**
   * Build section hierarchy (nest children under parents)
   */
  private buildHierarchy(flatSections: Section[]): Section[] {
    const root: Section[] = [];
    const stack: Section[] = [];

    for (const section of flatSections) {
      // Pop stack until we find a parent with lower level
      while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        // Top-level section
        root.push(section);
      } else {
        // Nested section
        stack[stack.length - 1].children.push(section);
      }

      stack.push(section);
    }

    return root;
  }

  /**
   * Extract tables
   */
  private extractTables(document: Document): Table[] {
    const tables: Table[] = [];
    const tableElements = document.querySelectorAll('table');

    tableElements.forEach((table) => {
      const headers: string[] = [];
      const rows: string[][] = [];

      // Extract headers
      const thead = table.querySelector('thead');
      if (thead) {
        const headerCells = thead.querySelectorAll('th');
        headerCells.forEach((th) => {
          headers.push(th.textContent?.trim() || '');
        });
      }

      // Extract rows
      const tbody = table.querySelector('tbody') || table;
      const rowElements = tbody.querySelectorAll('tr');

      rowElements.forEach((tr) => {
        const cells = tr.querySelectorAll('td, th');
        if (cells.length > 0) {
          const row: string[] = [];
          cells.forEach((cell) => {
            row.push(cell.textContent?.trim() || '');
          });
          rows.push(row);
        }
      });

      // Extract caption if present
      const caption = table.querySelector('caption');

      tables.push({
        headers: headers.length > 0 ? headers : rows[0] || [],
        rows: headers.length > 0 ? rows : rows.slice(1),
        caption: caption?.textContent?.trim() || null,
        startIndex: 0,
        endIndex: 0,
      });
    });

    return tables;
  }

  /**
   * Extract code blocks
   */
  private extractCodeBlocks(document: Document): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];

    // Confluence code macro
    const codeMacros = document.querySelectorAll(
      'ac\\:structured-macro[ac\\:name="code"]'
    );

    codeMacros.forEach((macro) => {
      const languageParam = macro.querySelector(
        'ac\\:parameter[ac\\:name="language"]'
      );
      const language = languageParam?.textContent?.trim() || null;

      const codeContent = macro.querySelector('ac\\:plain-text-body');
      const code = codeContent?.textContent || '';

      codeBlocks.push({
        language,
        code: code.trim(),
        startIndex: 0,
        endIndex: 0,
      });
    });

    // Standard HTML pre/code blocks
    const preElements = document.querySelectorAll('pre code, pre');
    preElements.forEach((pre) => {
      const code = pre.textContent || '';
      if (code.trim()) {
        codeBlocks.push({
          language: null,
          code: code.trim(),
          startIndex: 0,
          endIndex: 0,
        });
      }
    });

    return codeBlocks;
  }
}

/**
 * Build heading path from section hierarchy
 *
 * @param section - Current section
 * @param ancestors - Parent sections
 * @returns Array of heading strings from root to current
 */
export function buildHeadingPath(
  section: Section,
  ancestors: Section[] = []
): string[] {
  return [...ancestors.map((s) => s.heading), section.heading];
}

/**
 * Flatten section hierarchy to array
 */
export function flattenSections(sections: Section[]): Section[] {
  const flattened: Section[] = [];

  function traverse(section: Section, depth = 0) {
    flattened.push(section);
    section.children.forEach((child) => traverse(child, depth + 1));
  }

  sections.forEach((section) => traverse(section));

  return flattened;
}
