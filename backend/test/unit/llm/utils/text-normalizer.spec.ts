import {
  normalizeForHash,
  computeContentHash,
  detectLanguage,
  normalizeTag,
} from '@modules/llm/utils/text-normalizer';

describe('TextNormalizer', () => {
  describe('normalizeForHash', () => {
    it('should trim whitespace', () => {
      expect(normalizeForHash('  hello  ')).toBe('hello');
    });

    it('should collapse multiple spaces to single space', () => {
      expect(normalizeForHash('hello    world')).toBe('hello world');
    });

    it('should collapse 3+ newlines to 2', () => {
      expect(normalizeForHash('line1\n\n\n\nline2')).toBe('line1\n\nline2');
    });

    it('should remove leading emojis', () => {
      expect(normalizeForHash('📋 Document title')).toBe('document title');
      // Note: Some emojis with variant selectors may leave invisible characters
      const result = normalizeForHash('🗺️ Navigation');
      expect(result.toLowerCase()).toContain('navigation');
      expect(result).not.toContain('🗺'); // Main emoji should be removed
    });

    it('should convert to lowercase', () => {
      expect(normalizeForHash('Hello World')).toBe('hello world');
    });

    it('should handle combined transformations', () => {
      const input = '  📋  Hello    World  \n\n\n\n  Test  ';
      // Normalization trims, collapses spaces, collapses newlines, removes emojis, lowercases
      const result = normalizeForHash(input);
      expect(result).toContain('hello world');
      expect(result).toContain('test');
      expect(result.split('\n\n').length).toBe(2); // Should have collapsed to 2 newlines
    });
  });

  describe('computeContentHash', () => {
    it('should return sha256 hash with prefix', () => {
      const hash = computeContentHash('test content');
      expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('should produce same hash for same normalized content', () => {
      const hash1 = computeContentHash('  Test  Content  ');
      const hash2 = computeContentHash('test content');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different content', () => {
      const hash1 = computeContentHash('content 1');
      const hash2 = computeContentHash('content 2');
      expect(hash1).not.toBe(hash2);
    });

    it('should ignore emojis when hashing', () => {
      const hash1 = computeContentHash('📋 Document');
      const hash2 = computeContentHash('Document');
      expect(hash1).toBe(hash2);
    });
  });

  describe('detectLanguage', () => {
    it('should detect Russian text', () => {
      expect(detectLanguage('Привет мир')).toBe('ru');
      expect(detectLanguage('Это тестовый текст на русском')).toBe('ru');
    });

    it('should detect English text', () => {
      expect(detectLanguage('Hello world')).toBe('en');
      expect(detectLanguage('This is test text in English')).toBe('en');
    });

    it('should detect mixed text', () => {
      expect(detectLanguage('Hello мир')).toBe('ru'); // Has some Cyrillic
    });

    it('should default to English for empty text', () => {
      expect(detectLanguage('')).toBe('en');
      expect(detectLanguage('   ')).toBe('en');
    });

    it('should handle text with no letters', () => {
      expect(detectLanguage('123 456 !@#')).toBe('en');
    });

    it('should detect language based on >10% Cyrillic threshold', () => {
      // Mostly Latin with some Cyrillic (>10%)
      expect(detectLanguage('test тест test test test')).toBe('ru');

      // Very little Cyrillic (<10%) - returns 'mixed' when has Latin + little Cyrillic
      // The function returns 'mixed' when there's some Cyrillic but not enough for 'ru'
      const result = detectLanguage('a'.repeat(100) + 'б');
      expect(['en', 'mixed']).toContain(result);
    });
  });

  describe('normalizeTag', () => {
    it('should convert to lowercase', () => {
      expect(normalizeTag('RAG')).toBe('rag');
      expect(normalizeTag('LangChain')).toBe('langchain');
    });

    it('should replace spaces with hyphens', () => {
      expect(normalizeTag('Machine Learning')).toBe('machine-learning');
      expect(normalizeTag('Natural Language Processing')).toBe('natural-language-processing');
    });

    it('should remove non-alphanumeric characters', () => {
      expect(normalizeTag('test@tag!')).toBe('testtag');
      expect(normalizeTag('tag#with$symbols')).toBe('tagwithsymbols');
    });

    it('should collapse multiple hyphens', () => {
      expect(normalizeTag('test---tag')).toBe('test-tag');
    });

    it('should remove leading/trailing hyphens', () => {
      expect(normalizeTag('-test-tag-')).toBe('test-tag');
    });

    it('should handle combined transformations', () => {
      expect(normalizeTag('  RAG System!! ')).toBe('rag-system');
      expect(normalizeTag('Claude-Code 2.0')).toBe('claude-code-20');
    });

    it('should handle empty or whitespace-only input', () => {
      expect(normalizeTag('')).toBe('');
      expect(normalizeTag('   ')).toBe('');
    });
  });
});
