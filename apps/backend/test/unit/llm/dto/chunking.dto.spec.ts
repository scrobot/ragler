import {
  LlmChunkItemSchema,
  LlmChunkResponseSchema,
  ChunkSchema,
} from '@modules/llm/dto/chunking.dto';

describe('Chunking DTOs', () => {
  describe('LlmChunkItemSchema', () => {
    it('should validate correct chunk item', () => {
      const validChunk = {
        id: 'temp_1',
        text: 'Some content here',
        is_dirty: false,
      };

      const result = LlmChunkItemSchema.safeParse(validChunk);
      expect(result.success).toBe(true);
    });

    it('should reject invalid chunk id format (missing temp_ prefix)', () => {
      const invalidChunk = {
        id: '1',
        text: 'Content',
        is_dirty: false,
      };

      const result = LlmChunkItemSchema.safeParse(invalidChunk);
      expect(result.success).toBe(false);
    });

    it('should reject invalid chunk id format (non-numeric suffix)', () => {
      const invalidChunk = {
        id: 'temp_abc',
        text: 'Content',
        is_dirty: false,
      };

      const result = LlmChunkItemSchema.safeParse(invalidChunk);
      expect(result.success).toBe(false);
    });

    it('should accept temp_0 as valid id', () => {
      const validChunk = {
        id: 'temp_0',
        text: 'Content',
        is_dirty: false,
      };

      const result = LlmChunkItemSchema.safeParse(validChunk);
      expect(result.success).toBe(true);
    });

    it('should accept multi-digit ids like temp_123', () => {
      const validChunk = {
        id: 'temp_123',
        text: 'Content',
        is_dirty: false,
      };

      const result = LlmChunkItemSchema.safeParse(validChunk);
      expect(result.success).toBe(true);
    });

    it('should reject empty text', () => {
      const invalidChunk = {
        id: 'temp_1',
        text: '',
        is_dirty: false,
      };

      const result = LlmChunkItemSchema.safeParse(invalidChunk);
      expect(result.success).toBe(false);
    });

    it('should accept text with only whitespace (not empty)', () => {
      const validChunk = {
        id: 'temp_1',
        text: '   ',
        is_dirty: false,
      };

      // Note: min(1) only checks length, not content
      const result = LlmChunkItemSchema.safeParse(validChunk);
      expect(result.success).toBe(true);
    });

    it('should require is_dirty to be boolean', () => {
      const invalidChunk = {
        id: 'temp_1',
        text: 'Content',
        is_dirty: 'false',
      };

      const result = LlmChunkItemSchema.safeParse(invalidChunk);
      expect(result.success).toBe(false);
    });

    it('should accept is_dirty as true', () => {
      const validChunk = {
        id: 'temp_1',
        text: 'Content',
        is_dirty: true,
      };

      const result = LlmChunkItemSchema.safeParse(validChunk);
      expect(result.success).toBe(true);
    });
  });

  describe('LlmChunkResponseSchema', () => {
    it('should validate correct response with multiple chunks', () => {
      const validResponse = {
        chunks: [
          { id: 'temp_1', text: 'First chunk', is_dirty: false },
          { id: 'temp_2', text: 'Second chunk', is_dirty: false },
        ],
      };

      const result = LlmChunkResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should validate response with single chunk', () => {
      const validResponse = {
        chunks: [{ id: 'temp_1', text: 'Only chunk', is_dirty: false }],
      };

      const result = LlmChunkResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should reject empty chunks array', () => {
      const invalidResponse = {
        chunks: [],
      };

      const result = LlmChunkResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should reject missing chunks property', () => {
      const invalidResponse = {};

      const result = LlmChunkResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should reject chunks with invalid items', () => {
      const invalidResponse = {
        chunks: [
          { id: 'temp_1', text: 'Valid chunk', is_dirty: false },
          { id: 'invalid', text: 'Invalid id', is_dirty: false },
        ],
      };

      const result = LlmChunkResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('ChunkSchema (re-exported from session)', () => {
    it('should validate correct chunk DTO', () => {
      const validDto = {
        id: 'temp_1',
        text: 'Content here',
        isDirty: false,
      };

      const result = ChunkSchema.safeParse(validDto);
      expect(result.success).toBe(true);
    });

    it('should use camelCase isDirty property', () => {
      const dto = {
        id: 'temp_1',
        text: 'Content',
        isDirty: true,
      };

      const result = ChunkSchema.safeParse(dto);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isDirty).toBe(true);
      }
    });

    it('should reject snake_case is_dirty property', () => {
      const dto = {
        id: 'temp_1',
        text: 'Content',
        is_dirty: false,
      };

      const result = ChunkSchema.safeParse(dto);
      expect(result.success).toBe(false);
    });

    it('should allow any string id format (not restricted to temp_N)', () => {
      // ChunkDto is the internal format, can have any id after transformation
      const dto = {
        id: 'uuid-style-id',
        text: 'Content',
        isDirty: false,
      };

      const result = ChunkSchema.safeParse(dto);
      expect(result.success).toBe(true);
    });
  });
});
