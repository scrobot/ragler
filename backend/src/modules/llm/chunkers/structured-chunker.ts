import {
  DocumentStructure,
  Section,
  Table,
  CodeBlock,
  buildHeadingPath,
  flattenSections,
} from '../parsers/document-parser';
import { countTokens, splitOnBoundaries } from '../utils/token-counter';
import { ChunkType } from '@modules/vector/dto/payload.dto';

/**
 * Structured chunker - creates semantically meaningful chunks from parsed documents
 *
 * Strategy:
 * 1. Chunk by sections (respecting heading hierarchy)
 * 2. Split large sections on semantic boundaries
 * 3. Extract table rows as individual chunks
 * 4. Keep code blocks intact
 * 5. Classify chunk type (knowledge, navigation, table_row, code)
 *
 * Token limits:
 * - Target: 150-400 tokens (sweet spot for retrieval)
 * - Maximum: 700 tokens (hard limit)
 */

export interface ChunkInput {
  text: string;
  headingPath: string[];
  type: ChunkType;
  metadata?: Record<string, unknown>;
}

export interface ChunkerOptions {
  targetTokens?: number; // Default: 300
  maxTokens?: number; // Default: 700
  minTokens?: number; // Default: 50
}

export class StructuredChunker {
  private readonly targetTokens: number;
  private readonly maxTokens: number;
  private readonly minTokens: number;

  constructor(options: ChunkerOptions = {}) {
    this.targetTokens = options.targetTokens ?? 300;
    this.maxTokens = options.maxTokens ?? 700;
    this.minTokens = options.minTokens ?? 50;
  }

  /**
   * Chunk a parsed document structure
   *
   * @param structure - Parsed document structure
   * @returns Array of chunk inputs ready for further processing
   */
  chunk(structure: DocumentStructure): ChunkInput[] {
    const chunks: ChunkInput[] = [];

    // Chunk sections
    const sectionChunks = this.chunkSections(structure.sections);
    chunks.push(...sectionChunks);

    // Chunk tables (per row)
    const tableChunks = this.chunkTables(structure.tables);
    chunks.push(...tableChunks);

    // Chunk code blocks
    const codeChunks = this.chunkCodeBlocks(structure.codeBlocks);
    chunks.push(...codeChunks);

    return chunks;
  }

  /**
   * Chunk sections with heading hierarchy
   */
  private chunkSections(sections: Section[]): ChunkInput[] {
    const chunks: ChunkInput[] = [];
    const flatSections = flattenSections(sections);

    for (const section of flatSections) {
      const headingPath = this.buildSectionPath(section, flatSections);
      const chunkType = this.classifyText(section.content);

      // Check if section content fits in one chunk
      const tokens = countTokens(section.content);

      if (tokens <= this.targetTokens) {
        // Small section - keep as single chunk
        if (section.content.trim()) {
          chunks.push({
            text: section.content.trim(),
            headingPath,
            type: chunkType,
          });
        }
      } else {
        // Large section - split on boundaries
        const splitChunks = splitOnBoundaries(
          section.content,
          this.targetTokens,
          this.maxTokens
        );

        for (let i = 0; i < splitChunks.length; i++) {
          const text = splitChunks[i].trim();
          if (text && countTokens(text) >= this.minTokens) {
            chunks.push({
              text,
              headingPath:
                i === 0 ? headingPath : [...headingPath, `(part ${i + 1})`],
              type: this.classifyText(text),
            });
          }
        }
      }
    }

    return chunks;
  }

  /**
   * Chunk tables into per-row chunks
   */
  private chunkTables(tables: Table[]): ChunkInput[] {
    const chunks: ChunkInput[] = [];

    for (const table of tables) {
      const headingPath = table.caption
        ? ['Table', table.caption]
        : ['Table'];

      // Each row becomes a chunk
      for (const row of table.rows) {
        if (row.length === 0 || row.every((cell) => !cell.trim())) {
          continue; // Skip empty rows
        }

        // Format row as "Column1 / Column2 / Column3"
        const text = row.join(' / ');

        // Include headers in heading path if available
        const fullHeadingPath =
          table.headers.length > 0
            ? [...headingPath, table.headers.join(' | ')]
            : headingPath;

        chunks.push({
          text,
          headingPath: fullHeadingPath,
          type: 'table_row',
        });
      }
    }

    return chunks;
  }

  /**
   * Chunk code blocks (keep intact or split if too large)
   */
  private chunkCodeBlocks(codeBlocks: CodeBlock[]): ChunkInput[] {
    const chunks: ChunkInput[] = [];

    for (const block of codeBlocks) {
      const tokens = countTokens(block.code);
      const headingPath = block.language
        ? ['Code', block.language]
        : ['Code'];

      if (tokens <= this.maxTokens) {
        // Code block fits - keep intact
        chunks.push({
          text: block.code,
          headingPath,
          type: 'code',
        });
      } else {
        // Large code block - split on function/class boundaries
        const splitChunks = this.splitCodeBlock(block.code);

        for (let i = 0; i < splitChunks.length; i++) {
          chunks.push({
            text: splitChunks[i],
            headingPath:
              i === 0 ? headingPath : [...headingPath, `(part ${i + 1})`],
            type: 'code',
          });
        }
      }
    }

    return chunks;
  }

  /**
   * Split large code block on logical boundaries
   */
  private splitCodeBlock(code: string): string[] {
    // Try to split on function/class boundaries
    const lines = code.split('\n');
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentTokens = 0;

    for (const line of lines) {
      const lineTokens = countTokens(line);

      if (
        currentTokens + lineTokens > this.maxTokens &&
        currentChunk.length > 0
      ) {
        // Chunk is full
        chunks.push(currentChunk.join('\n'));
        currentChunk = [line];
        currentTokens = lineTokens;
      } else {
        currentChunk.push(line);
        currentTokens += lineTokens;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n'));
    }

    return chunks;
  }

  /**
   * Classify text chunk type based on content
   *
   * Heuristics:
   * - Navigation: Contains contact keywords, links, navigation markers
   * - Code: Already classified by code block detector
   * - Table row: Already classified by table detector
   * - Knowledge: Default for content
   */
  private classifyText(text: string): ChunkType {
    const lower = text.toLowerCase();

    // Navigation keywords
    const navKeywords = [
      'контакты',
      'контактные данные',
      'slack',
      'репозиторий',
      'как проходить',
      'быстрая навигация',
      'ссылки:',
      'полезные ссылки',
      'где найти',
      'канал в slack',
      'github',
      'confluence',
    ];

    if (navKeywords.some((kw) => lower.includes(kw))) {
      return 'navigation';
    }

    // FAQ patterns
    if (
      /^(q:|вопрос:|question:)/i.test(text) ||
      /^(a:|ответ:|answer:)/i.test(text)
    ) {
      return 'faq';
    }

    // Glossary patterns
    if (/^[А-Яа-яA-Za-z\s]+\s*[-–—]\s*/.test(text)) {
      // "Term - definition" format
      return 'glossary';
    }

    // Default to knowledge
    return 'knowledge';
  }

  /**
   * Build section path from flat section list
   */
  private buildSectionPath(
    section: Section,
    allSections: Section[]
  ): string[] {
    const path: string[] = [];
    let currentLevel = section.level;

    // Find all parent sections
    const sectionIndex = allSections.indexOf(section);

    for (let i = sectionIndex - 1; i >= 0; i--) {
      const candidate = allSections[i];
      if (candidate.level < currentLevel) {
        path.unshift(candidate.heading);
        currentLevel = candidate.level;
      }

      if (currentLevel === 1) break; // Reached top level
    }

    // Add current section
    path.push(section.heading);

    return path;
  }
}
