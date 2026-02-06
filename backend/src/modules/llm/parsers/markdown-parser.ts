import { DocumentStructure, Section, Table, CodeBlock } from './document-parser';

/**
 * Simple markdown parser for manual content
 * Extracts heading hierarchy, tables, and code blocks
 */
export class MarkdownParser {
  parse(markdown: string): DocumentStructure {
    const lines = markdown.split('\n');
    const sections: Section[] = [];
    const tables: Table[] = [];
    const codeBlocks: CodeBlock[] = [];

    let currentSection: Section | null = null;
    let sectionContent: string[] = [];
    let currentPosition = 0;
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];
    let codeBlockLanguage: string | null = null;
    let codeBlockStart = 0;
    let inTable = false;
    let tableLines: string[] = [];
    let tableStart = 0;

    const finishSection = () => {
      if (currentSection && sectionContent.length > 0) {
        currentSection.content = sectionContent.join('\n').trim();
        currentSection.endIndex = currentPosition;
        if (currentSection.content) {
          sections.push(currentSection);
        }
      }
      sectionContent = [];
    };

    const finishCodeBlock = () => {
      if (codeBlockLines.length > 0) {
        codeBlocks.push({
          code: codeBlockLines.join('\n'),
          language: codeBlockLanguage,
          startIndex: codeBlockStart,
          endIndex: currentPosition,
        });
        codeBlockLines = [];
        codeBlockLanguage = null;
      }
    };

    const finishTable = () => {
      if (tableLines.length > 0) {
        const table = this.parseTable(tableLines);
        if (table) {
          tables.push({
            ...table,
            startIndex: tableStart,
            endIndex: currentPosition,
          });
        }
        tableLines = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      currentPosition += line.length + 1; // +1 for newline

      // Handle code blocks
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          // Starting code block
          inCodeBlock = true;
          codeBlockStart = currentPosition - line.length - 1;
          const match = line.match(/```(\w+)?/);
          codeBlockLanguage = match?.[1] || null;
        } else {
          // Ending code block
          inCodeBlock = false;
          finishCodeBlock();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      // Handle tables
      if (line.trim().startsWith('|')) {
        if (!inTable) {
          finishTable();
          inTable = true;
          tableStart = currentPosition - line.length - 1;
        }
        tableLines.push(line);
        continue;
      } else if (inTable) {
        finishTable();
        inTable = false;
      }

      // Handle headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        finishSection();

        const level = headingMatch[1].length;
        const heading = headingMatch[2].trim();

        currentSection = {
          level,
          heading,
          content: '',
          children: [],
          startIndex: currentPosition - line.length - 1,
          endIndex: currentPosition,
        };
        continue;
      }

      // Regular content
      if (line.trim() || sectionContent.length > 0) {
        sectionContent.push(line);
      }
    }

    // Finish any remaining blocks
    finishSection();
    finishCodeBlock();
    finishTable();

    // If no sections were found, create a default section
    if (sections.length === 0 && markdown.trim()) {
      sections.push({
        level: 1,
        heading: 'Content',
        content: markdown.trim(),
        children: [],
        startIndex: 0,
        endIndex: markdown.length,
      });
    }

    // Build hierarchy
    const hierarchicalSections = this.buildHierarchy(sections);

    // Extract title from first heading or default
    const title = sections.length > 0 ? sections[0].heading : 'Document';

    return {
      title,
      sections: hierarchicalSections,
      tables,
      codeBlocks,
    };
  }

  private parseTable(lines: string[]): Omit<Table, 'startIndex' | 'endIndex'> | null {
    if (lines.length < 2) return null;

    // First line is headers
    const headerLine = lines[0];
    const headers = headerLine
      .split('|')
      .map((h) => h.trim())
      .filter((h) => h.length > 0);

    if (headers.length === 0) return null;

    // Second line should be separator (|---|---|)
    // Skip it and process remaining lines as data rows

    const rows: string[][] = [];
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter((c, idx) => idx > 0 && idx <= headers.length);

      if (cells.length > 0) {
        // Pad with empty strings if row has fewer cells than headers
        while (cells.length < headers.length) {
          cells.push('');
        }
        rows.push(cells.slice(0, headers.length));
      }
    }

    return {
      headers,
      rows,
      caption: null,
    };
  }

  private buildHierarchy(sections: Section[]): Section[] {
    if (sections.length === 0) return [];

    const root: Section[] = [];
    const stack: Section[] = [];

    for (const section of sections) {
      // Pop stack until we find a parent with lower level
      while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        // Top-level section
        root.push(section);
      } else {
        // Child section
        stack[stack.length - 1].children.push(section);
      }

      stack.push(section);
    }

    return root;
  }
}
