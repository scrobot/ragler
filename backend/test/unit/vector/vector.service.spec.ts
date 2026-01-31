import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VectorService } from '../../../src/modules/vector/vector.service';
import { QdrantClientService } from '../../../src/infrastructure/qdrant';
import { LlmService } from '../../../src/modules/llm/llm.service';
import { SearchRequestDto } from '../../../src/modules/vector/dto';

describe('VectorService', () => {
  let service: VectorService;
  let mockQdrantClient: jest.Mocked<Pick<QdrantClientService, 'collectionExists' | 'search'>>;
  let mockLlmService: jest.Mocked<Pick<LlmService, 'generateEmbedding'>>;

  const mockEmbedding = new Array(1536).fill(0.01);
  const validCollectionId = '550e8400-e29b-41d4-a716-446655440000';

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
          payload: {
            content: 'Test content 1',
            source_url: 'https://example.com/1',
            source_type: 'web',
          },
        },
        {
          id: 'point-2',
          score: 0.85,
          payload: {
            content: 'Test content 2',
            source_url: 'https://example.com/2',
            source_type: 'confluence',
          },
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
      );

      expect(result).toEqual({
        results: [
          {
            id: 'point-1',
            score: 0.95,
            content: 'Test content 1',
            sourceUrl: 'https://example.com/1',
            sourceType: 'web',
          },
          {
            id: 'point-2',
            score: 0.85,
            content: 'Test content 2',
            sourceUrl: 'https://example.com/2',
            sourceType: 'confluence',
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
      );
    });

    it('should handle missing payload fields with empty string fallbacks', async () => {
      const dto: SearchRequestDto = {
        query: 'test query',
        collectionId: validCollectionId,
        limit: 10,
      };

      const qdrantResults = [
        {
          id: 'point-1',
          score: 0.95,
          payload: {},
        },
        {
          id: 'point-2',
          score: 0.85,
          payload: null,
        },
        {
          id: 'point-3',
          score: 0.75,
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
          content: '',
          sourceUrl: '',
          sourceType: '',
        },
        {
          id: 'point-2',
          score: 0.85,
          content: '',
          sourceUrl: '',
          sourceType: '',
        },
        {
          id: 'point-3',
          score: 0.75,
          content: '',
          sourceUrl: '',
          sourceType: '',
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
          payload: { content: 'test' },
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
