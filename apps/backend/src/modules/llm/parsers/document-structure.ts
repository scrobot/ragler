/**
 * Shared document structure interfaces used by parsers and chunkers.
 *
 * Houses types shared between MarkdownParser and StructuredChunker.
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
 * Build heading path from section hierarchy
 *
 * @param section - Current section
 * @param ancestors - Parent sections
 * @returns Array of heading strings from root to current
 */
export function buildHeadingPath(
  section: Section,
  ancestors: Section[] = [],
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
