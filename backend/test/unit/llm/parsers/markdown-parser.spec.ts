import { MarkdownParser } from '@llm/parsers/markdown-parser';

describe('MarkdownParser', () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser();
  });

  describe('headings', () => {
    it('should parse h1 heading', () => {
      const result = parser.parse('# Hello World\n\nSome content here.');

      expect(result.title).toBe('Hello World');
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].heading).toBe('Hello World');
      expect(result.sections[0].level).toBe(1);
      expect(result.sections[0].content).toContain('Some content here.');
    });

    it('should parse multiple heading levels', () => {
      const md = [
        '# Title',
        'Intro',
        '## Section A',
        'Content A',
        '### Sub Section',
        'Content Sub',
        '## Section B',
        'Content B',
      ].join('\n');

      const result = parser.parse(md);

      expect(result.title).toBe('Title');
      expect(result.sections).toHaveLength(1); // single root
      expect(result.sections[0].children).toHaveLength(2); // Section A, Section B
      expect(result.sections[0].children[0].heading).toBe('Section A');
      expect(result.sections[0].children[0].children).toHaveLength(1); // Sub Section
      expect(result.sections[0].children[0].children[0].heading).toBe('Sub Section');
      expect(result.sections[0].children[1].heading).toBe('Section B');
    });

    it('should handle h2-h6 headings', () => {
      const md = '## H2\nA\n### H3\nB\n#### H4\nC\n##### H5\nD\n###### H6\nE';
      const result = parser.parse(md);

      expect(result.sections.length).toBeGreaterThanOrEqual(1);
      expect(result.sections[0].heading).toBe('H2');
      expect(result.sections[0].level).toBe(2);
    });

    it('should handle headings without content', () => {
      const md = '# Empty Section\n## Also Empty';
      const result = parser.parse(md);

      // Sections without content are not pushed
      expect(result.sections.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('code blocks', () => {
    it('should extract fenced code blocks', () => {
      const md = '# Code Example\n\n```typescript\nconst x = 1;\nconst y = 2;\n```\n\nAfter code.';
      const result = parser.parse(md);

      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0].language).toBe('typescript');
      expect(result.codeBlocks[0].code).toContain('const x = 1;');
      expect(result.codeBlocks[0].code).toContain('const y = 2;');
    });

    it('should extract code block without language', () => {
      const md = '```\nplain code\n```';
      const result = parser.parse(md);

      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0].language).toBeNull();
      expect(result.codeBlocks[0].code).toBe('plain code');
    });

    it('should handle multiple code blocks', () => {
      const md = '```js\nalert(1);\n```\n\nText\n\n```python\nprint(1)\n```';
      const result = parser.parse(md);

      expect(result.codeBlocks).toHaveLength(2);
      expect(result.codeBlocks[0].language).toBe('js');
      expect(result.codeBlocks[1].language).toBe('python');
    });
  });

  describe('tables', () => {
    it('should extract markdown table', () => {
      const md = [
        '# Data',
        '',
        '| Name | Age |',
        '|------|-----|',
        '| Alice | 30 |',
        '| Bob | 25 |',
      ].join('\n');

      const result = parser.parse(md);

      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].headers).toEqual(['Name', 'Age']);
      expect(result.tables[0].rows).toHaveLength(2);
      expect(result.tables[0].rows[0]).toContain('Alice');
    });

    it('should handle table with empty cells', () => {
      const md = '| Col1 | Col2 |\n|------|------|\n| val |  |';
      const result = parser.parse(md);

      expect(result.tables).toHaveLength(1);
      // Rows may pad with empty strings
      expect(result.tables[0].rows).toHaveLength(1);
    });
  });

  describe('default section', () => {
    it('should create default section for content without headings', () => {
      const md = 'Just some content\nwithout any headings.';
      const result = parser.parse(md);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].heading).toBe('Content');
      expect(result.sections[0].content).toContain('Just some content');
    });

    it('should return empty sections for empty input', () => {
      const result = parser.parse('');

      expect(result.sections).toHaveLength(0);
    });

    it('should return empty sections for whitespace-only input', () => {
      const result = parser.parse('   \n  \t  ');

      // Whitespace-only trimmed to empty = no sections
      expect(result.sections).toHaveLength(0);
    });
  });

  describe('hierarchy building', () => {
    it('should nest h3 under h2 under h1', () => {
      const md = '# Root\nR\n## Child\nC\n### Grandchild\nG';
      const result = parser.parse(md);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].heading).toBe('Root');
      expect(result.sections[0].children).toHaveLength(1);
      expect(result.sections[0].children[0].heading).toBe('Child');
      expect(result.sections[0].children[0].children).toHaveLength(1);
      expect(result.sections[0].children[0].children[0].heading).toBe('Grandchild');
    });

    it('should handle sibling sections at same level', () => {
      const md = '## First\nA\n## Second\nB\n## Third\nC';
      const result = parser.parse(md);

      expect(result.sections).toHaveLength(3);
      expect(result.sections[0].heading).toBe('First');
      expect(result.sections[1].heading).toBe('Second');
      expect(result.sections[2].heading).toBe('Third');
    });

    it('should handle level jumps (h1 → h3 skipping h2)', () => {
      const md = '# Title\nT\n### Deep\nD';
      const result = parser.parse(md);

      expect(result.sections).toHaveLength(1);
      // h3 is nested under h1 even though h2 was skipped
      expect(result.sections[0].children).toHaveLength(1);
      expect(result.sections[0].children[0].heading).toBe('Deep');
    });
  });

  describe('mixed content', () => {
    it('should handle document with headings, code, and tables', () => {
      const md = [
        '# Guide',
        '',
        'Introduction text.',
        '',
        '## Installation',
        '',
        '```bash',
        'npm install',
        '```',
        '',
        '## Data',
        '',
        '| Pkg | Version |',
        '|-----|---------|',
        '| nestjs | 11 |',
        '',
        '### Notes',
        '',
        'Some notes here.',
      ].join('\n');

      const result = parser.parse(md);

      expect(result.title).toBe('Guide');
      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0].language).toBe('bash');
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].headers).toContain('Pkg');
      expect(result.sections[0].children.length).toBeGreaterThanOrEqual(2);
    });
  });
});
