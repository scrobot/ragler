import { StructuredChunker } from '@modules/llm/chunkers/structured-chunker';
import type { DocumentStructure } from '@modules/llm/parsers/document-parser';

describe('StructuredChunker', () => {
  let chunker: StructuredChunker;

  beforeEach(() => {
    chunker = new StructuredChunker({
      targetTokens: 300,
      maxTokens: 700,
      minTokens: 50,
    });
  });

  describe('section chunking', () => {
    it('should create chunks from document sections', () => {
      const structure: DocumentStructure = {
        title: 'Test Document',
        sections: [
          {
            level: 1,
            heading: 'Introduction',
            content: 'This is the introduction section with some content.',
            children: [],
            startIndex: 0,
            endIndex: 100,
          },
          {
            level: 1,
            heading: 'Main Content',
            content: 'This is the main content section with more details.',
            children: [],
            startIndex: 100,
            endIndex: 200,
          },
        ],
        tables: [],
        codeBlocks: [],
      };

      const chunks = chunker.chunk(structure);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].headingPath).toContain('Introduction');
      expect(chunks[0].text).toContain('introduction');
      expect(chunks[0].type).toBe('knowledge');
    });

    it('should build heading paths from hierarchy', () => {
      const structure: DocumentStructure = {
        title: 'Test Document',
        sections: [
          {
            level: 1,
            heading: 'Chapter 1',
            content: 'Chapter content',
            children: [
              {
                level: 2,
                heading: 'Section 1.1',
                content: 'Section content',
                children: [],
                startIndex: 0,
                endIndex: 50,
              },
            ],
            startIndex: 0,
            endIndex: 100,
          },
        ],
        tables: [],
        codeBlocks: [],
      };

      const chunks = chunker.chunk(structure);

      // Should have chunks for both parent and child
      expect(chunks.length).toBeGreaterThan(0);

      // Check that heading path is built correctly
      const sectionChunk = chunks.find(c => c.text.includes('Section content'));
      expect(sectionChunk).toBeDefined();
      expect(sectionChunk?.headingPath).toEqual(['Chapter 1', 'Section 1.1']);
    });

    it('should classify navigation chunks', () => {
      const structure: DocumentStructure = {
        title: 'Test Document',
        sections: [
          {
            level: 1,
            heading: 'Contacts',
            content: 'Email us at test@example.com or find us on slack channel #help',
            children: [],
            startIndex: 0,
            endIndex: 100,
          },
        ],
        tables: [],
        codeBlocks: [],
      };

      const chunks = chunker.chunk(structure);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].type).toBe('navigation');
    });

    it('should split large sections on boundaries', () => {
      // Create a large section that exceeds target tokens
      const largeContent = 'This is a test sentence. '.repeat(200); // ~1000 tokens

      const structure: DocumentStructure = {
        title: 'Test Document',
        sections: [
          {
            level: 1,
            heading: 'Large Section',
            content: largeContent,
            children: [],
            startIndex: 0,
            endIndex: largeContent.length,
          },
        ],
        tables: [],
        codeBlocks: [],
      };

      const chunks = chunker.chunk(structure);

      // Should split into multiple chunks
      expect(chunks.length).toBeGreaterThan(1);

      // All chunks should have same base heading
      chunks.forEach(chunk => {
        expect(chunk.headingPath[0]).toBe('Large Section');
      });

      // Subsequent chunks should have part indicator
      if (chunks.length > 1) {
        expect(chunks[1].headingPath).toContain('(part 2)');
      }
    });

    it('should skip empty sections', () => {
      const structure: DocumentStructure = {
        title: 'Test Document',
        sections: [
          {
            level: 1,
            heading: 'Empty Section',
            content: '   ',
            children: [],
            startIndex: 0,
            endIndex: 10,
          },
          {
            level: 1,
            heading: 'Valid Section',
            content: 'This has content',
            children: [],
            startIndex: 10,
            endIndex: 50,
          },
        ],
        tables: [],
        codeBlocks: [],
      };

      const chunks = chunker.chunk(structure);

      // Should only have chunk for non-empty section
      expect(chunks.length).toBe(1);
      expect(chunks[0].headingPath).toContain('Valid Section');
    });
  });

  describe('table chunking', () => {
    it('should create per-row chunks from tables', () => {
      const structure: DocumentStructure = {
        title: 'Test Document',
        sections: [],
        tables: [
          {
            headers: ['Name', 'Email', 'Role'],
            rows: [
              ['John Doe', 'john@example.com', 'Developer'],
              ['Jane Smith', 'jane@example.com', 'Designer'],
            ],
            caption: 'Team Members',
            startIndex: 0,
            endIndex: 100,
          },
        ],
        codeBlocks: [],
      };

      const chunks = chunker.chunk(structure);

      expect(chunks.length).toBe(2); // One per row
      expect(chunks[0].type).toBe('table_row');
      expect(chunks[0].text).toContain('John Doe / john@example.com / Developer');
      expect(chunks[0].headingPath).toContain('Table');
      expect(chunks[0].headingPath).toContain('Team Members');
    });

    it('should skip empty table rows', () => {
      const structure: DocumentStructure = {
        title: 'Test Document',
        sections: [],
        tables: [
          {
            headers: ['Col1', 'Col2'],
            rows: [
              ['Value1', 'Value2'],
              ['', ''], // Empty row
              ['Value3', 'Value4'],
            ],
            caption: null,
            startIndex: 0,
            endIndex: 100,
          },
        ],
        codeBlocks: [],
      };

      const chunks = chunker.chunk(structure);

      expect(chunks.length).toBe(2); // Should skip empty row
      expect(chunks[0].text).toContain('Value1');
      expect(chunks[1].text).toContain('Value3');
    });
  });

  describe('code block chunking', () => {
    it('should keep small code blocks intact', () => {
      const structure: DocumentStructure = {
        title: 'Test Document',
        sections: [],
        tables: [],
        codeBlocks: [
          {
            code: 'function hello() {\n  console.log("Hello");\n}',
            language: 'javascript',
            startIndex: 0,
            endIndex: 50,
          },
        ],
      };

      const chunks = chunker.chunk(structure);

      expect(chunks.length).toBe(1);
      expect(chunks[0].type).toBe('code');
      expect(chunks[0].text).toContain('function hello');
      expect(chunks[0].headingPath).toEqual(['Code', 'javascript']);
    });

    it('should split large code blocks', () => {
      // Create a large code block (>700 tokens)
      const largeCode = 'function test() {\n  // Comment\n  return true;\n}\n'.repeat(100);

      const structure: DocumentStructure = {
        title: 'Test Document',
        sections: [],
        tables: [],
        codeBlocks: [
          {
            code: largeCode,
            language: 'typescript',
            startIndex: 0,
            endIndex: largeCode.length,
          },
        ],
      };

      const chunks = chunker.chunk(structure);

      // Should split into multiple chunks
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.type).toBe('code');
      });
    });

    it('should handle code without language', () => {
      const structure: DocumentStructure = {
        title: 'Test Document',
        sections: [],
        tables: [],
        codeBlocks: [
          {
            code: 'some code',
            language: null,
            startIndex: 0,
            endIndex: 10,
          },
        ],
      };

      const chunks = chunker.chunk(structure);

      expect(chunks.length).toBe(1);
      expect(chunks[0].headingPath).toEqual(['Code']);
    });
  });

  describe('chunk type classification', () => {
    it('should classify FAQ chunks', () => {
      const structure: DocumentStructure = {
        title: 'Test Document',
        sections: [
          {
            level: 1,
            heading: 'FAQ',
            content: 'Q: What is RAG?\nA: Retrieval-Augmented Generation',
            children: [],
            startIndex: 0,
            endIndex: 100,
          },
        ],
        tables: [],
        codeBlocks: [],
      };

      const chunks = chunker.chunk(structure);

      // Should contain FAQ-type chunks
      const faqChunk = chunks.find(c => c.type === 'faq');
      expect(faqChunk).toBeDefined();
    });

    it('should classify glossary chunks', () => {
      const structure: DocumentStructure = {
        title: 'Test Document',
        sections: [
          {
            level: 1,
            heading: 'Glossary',
            content: 'RAG - Retrieval-Augmented Generation system',
            children: [],
            startIndex: 0,
            endIndex: 100,
          },
        ],
        tables: [],
        codeBlocks: [],
      };

      const chunks = chunker.chunk(structure);

      // Should detect glossary pattern
      const glossaryChunk = chunks.find(c => c.type === 'glossary');
      expect(glossaryChunk).toBeDefined();
    });

    it('should default to knowledge type', () => {
      const structure: DocumentStructure = {
        title: 'Test Document',
        sections: [
          {
            level: 1,
            heading: 'Introduction',
            content: 'This is regular content without special markers.',
            children: [],
            startIndex: 0,
            endIndex: 100,
          },
        ],
        tables: [],
        codeBlocks: [],
      };

      const chunks = chunker.chunk(structure);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].type).toBe('knowledge');
    });
  });

  describe('empty document handling', () => {
    it('should return empty array for document with no content', () => {
      const structure: DocumentStructure = {
        title: 'Empty Document',
        sections: [],
        tables: [],
        codeBlocks: [],
      };

      const chunks = chunker.chunk(structure);

      expect(chunks).toEqual([]);
    });
  });
});
