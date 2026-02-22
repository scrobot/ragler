import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VectorService } from '@vector/vector.service';
import { QdrantClientService } from '@infrastructure/qdrant';
import { LlmService } from '@llm/llm.service';
import { SearchRequestDto } from '@vector/dto';

describe('VectorService', () => {
  let service: VectorService;
  let mockQdrantClient: jest.Mocked<Pick<QdrantClientService, 'collectionExists' | 'search'>>;
  let mockLlmService: jest.Mocked<Pick<LlmService, 'generateEmbedding'>>;

  const mockEmbedding = new Array(1536).fill(0.01);
  const validCollectionId = '550e8400-e29b-41d4-a716-446655440000';

  // Helper to create v2 payload structure
  const createV2Payload = (overrides: any = {}) => ({
    doc: {
      url: 'https://example.com/test',
      title: 'Test Document',
      source_type: 'web',
      revision: 1,
      ...overrides.doc,
    },
    chunk: {
      text: 'Test content',
      type: 'knowledge',
      heading_path: ['Introduction'],
      section: 'Introduction',
      lang: 'en',
      ...overrides.chunk,
    },
    tags: overrides.tags || ['test'],
  });

  beforeEach(async () => {
    mockQdrantClient = {
      collectionExists: jest.fn(),
      search: jest.fn(),
    };

    mockLlmService = {
      generateEmbedding: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorService,
        { provide: QdrantClientService, useValue: mockQdrantClient },
        { provide: LlmService, useValue: mockLlmService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'openai.apiKey') return 'test-api-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<VectorService>(VectorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should return search results when collection exists', async () => {
      const dto: SearchRequestDto = {
        query: 'test query',
        collectionId: validCollectionId,
        limit: 10,
      };

      const qdrantResults = [
        {
          id: 'point-1',
          score: 0.95,
          payload: createV2Payload({
            doc: { url: 'https://example.com/1', source_type: 'web' },
            chunk: { text: 'Test content 1' },
          }),
        },
        {
          id: 'point-2',
          score: 0.85,
          payload: createV2Payload({
            doc: { url: 'https://example.com/2', source_type: 'confluence' },
            chunk: { text: 'Test content 2' },
          }),
        },
      ];

      mockQdrantClient.collectionExists.mockResolvedValue(true);
      mockLlmService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockQdrantClient.search.mockResolvedValue(qdrantResults);

      const result = await service.search(dto);

      expect(mockQdrantClient.collectionExists).toHaveBeenCalledWith(`kb_${validCollectionId}`);
      expect(mockLlmService.generateEmbedding).toHaveBeenCalledWith('test query');
      expect(mockQdrantClient.search).toHaveBeenCalledWith(
        `kb_${validCollectionId}`,
        mockEmbedding,
        10,
        expect.objectContaining({ must_not: expect.any(Array) }), // Expects navigation exclusion filter
      );

      expect(result).toEqual({
        results: [
          {
            id: 'point-1',
            score: 0.95,
            content: 'Test content 1',
            doc: {
              url: 'https://example.com/1',
              title: 'Test Document',
              source_type: 'web',
              revision: 1,
            },
            chunk: {
              type: 'knowledge',
              heading_path: ['Introduction'],
              section: 'Introduction',
              lang: 'en',
            },
            tags: ['test'],
          },
          {
            id: 'point-2',
            score: 0.85,
            content: 'Test content 2',
            doc: {
              url: 'https://example.com/2',
              title: 'Test Document',
              source_type: 'confluence',
              revision: 1,
            },
            chunk: {
              type: 'knowledge',
              heading_path: ['Introduction'],
              section: 'Introduction',
              lang: 'en',
            },
            tags: ['test'],
          },
        ],
        total: 2,
        query: 'test query',
      });
    });

    it('should throw NotFoundException when collection does not exist', async () => {
      const dto: SearchRequestDto = {
        query: 'test query',
        collectionId: validCollectionId,
        limit: 10,
      };

      mockQdrantClient.collectionExists.mockResolvedValue(false);

      await expect(service.search(dto)).rejects.toThrow(NotFoundException);
      await expect(service.search(dto)).rejects.toThrow(`Collection ${validCollectionId} not found`);

      expect(mockLlmService.generateEmbedding).not.toHaveBeenCalled();
      expect(mockQdrantClient.search).not.toHaveBeenCalled();
    });

    it('should return empty results when search yields no matches', async () => {
      const dto: SearchRequestDto = {
        query: 'nonexistent query',
        collectionId: validCollectionId,
        limit: 10,
      };

      mockQdrantClient.collectionExists.mockResolvedValue(true);
      mockLlmService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockQdrantClient.search.mockResolvedValue([]);

      const result = await service.search(dto);

      expect(result).toEqual({
        results: [],
        total: 0,
        query: 'nonexistent query',
      });
    });

    it('should use custom limit when provided', async () => {
      const dto: SearchRequestDto = {
        query: 'test query',
        collectionId: validCollectionId,
        limit: 5,
      };

      mockQdrantClient.collectionExists.mockResolvedValue(true);
      mockLlmService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockQdrantClient.search.mockResolvedValue([]);

      await service.search(dto);

      expect(mockQdrantClient.search).toHaveBeenCalledWith(
        `kb_${validCollectionId}`,
        mockEmbedding,
        5,
        expect.objectContaining({ must_not: expect.any(Array) }), // Expects navigation exclusion filter
      );
    });

    it('should use default limit of 10 when not provided', async () => {
      const dto = {
        query: 'test query',
        collectionId: validCollectionId,
      } as SearchRequestDto;

      mockQdrantClient.collectionExists.mockResolvedValue(true);
      mockLlmService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockQdrantClient.search.mockResolvedValue([]);

      await service.search(dto);

      expect(mockQdrantClient.search).toHaveBeenCalledWith(
        `kb_${validCollectionId}`,
        mockEmbedding,
        10,
        expect.objectContaining({ must_not: expect.any(Array) }), // Expects navigation exclusion filter
      );
    });

    it('should handle results with minimal payload fields', async () => {
      const dto: SearchRequestDto = {
        query: 'test query',
        collectionId: validCollectionId,
        limit: 10,
      };

      const qdrantResults = [
        {
          id: 'point-1',
          score: 0.95,
          payload: createV2Payload({
            doc: { title: null, url: 'https://example.com/minimal' },
            chunk: { text: 'Minimal content', heading_path: [], section: null },
          }),
        },
      ];

      mockQdrantClient.collectionExists.mockResolvedValue(true);
      mockLlmService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockQdrantClient.search.mockResolvedValue(qdrantResults);

      const result = await service.search(dto);

      expect(result.results).toEqual([
        {
          id: 'point-1',
          score: 0.95,
          content: 'Minimal content',
          doc: {
            url: 'https://example.com/minimal',
            title: null,
            source_type: 'web',
            revision: 1,
          },
          chunk: {
            type: 'knowledge',
            heading_path: [],
            section: null,
            lang: 'en',
          },
          tags: ['test'],
        },
      ]);
    });

    it('should convert numeric id to string', async () => {
      const dto: SearchRequestDto = {
        query: 'test query',
        collectionId: validCollectionId,
        limit: 10,
      };

      const qdrantResults = [
        {
          id: 12345,
          score: 0.95,
          payload: createV2Payload({ chunk: { text: 'test' } }),
        },
      ];

      mockQdrantClient.collectionExists.mockResolvedValue(true);
      mockLlmService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockQdrantClient.search.mockResolvedValue(qdrantResults);

      const result = await service.search(dto);

      expect(result.results[0].id).toBe('12345');
      expect(typeof result.results[0].id).toBe('string');
    });
  });
});
