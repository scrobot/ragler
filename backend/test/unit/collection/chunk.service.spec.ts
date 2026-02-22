import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ChunkService } from '@collection/chunk.service';
import { CollectionService } from '@collection/collection.service';
import { QdrantClientService } from '@infrastructure/qdrant';
import { LlmService } from '@llm/llm.service';
import type { QdrantPayload } from '@modules/vector/dto/payload.dto';

describe('ChunkService', () => {
  let service: ChunkService;
  let mockQdrantClient: jest.Mocked<
    Pick<
      QdrantClientService,
      | 'collectionExists'
      | 'getPoints'
      | 'countPoints'
      | 'scrollWithOrder'
      | 'upsertPoints'
      | 'deletePoints'
      | 'updatePayloads'
    >
  >;
  let mockLlmService: jest.Mocked<Pick<LlmService, 'generateEmbeddings'>>;
  let mockCollectionService: jest.Mocked<Pick<CollectionService, 'findOne'>>;

  const validCollectionId = '550e8400-e29b-41d4-a716-446655440000';
  const mockEmbedding = new Array(1536).fill(0.01);

  const createMockPayload = (overrides: Partial<{
    id: string;
    text: string;
    position: number;
  }> = {}): QdrantPayload => ({
    doc: {
      source_type: 'manual',
      source_id: `editor_${validCollectionId}`,
      url: `manual://editor/${validCollectionId}/${overrides.id || 'chunk-1'}`,
      space_key: null,
      title: null,
      revision: 1,
      last_modified_at: '2025-01-01T00:00:00.000Z',
      last_modified_by: 'user-1',
      filename: null,
      file_size: null,
      mime_type: null,
      ingest_date: '2025-01-01T00:00:00.000Z',
    },
    chunk: {
      id: overrides.id || 'chunk-1',
      index: overrides.position || 0,
      type: 'knowledge',
      heading_path: ['Test Section'],
      section: 'Test Section',
      text: overrides.text || 'Test chunk content',
      content_hash: 'sha256:abc123',
      lang: 'en',
    },
    tags: ['test'],
    acl: {
      visibility: 'internal',
      allowed_groups: [],
      allowed_users: [],
    },
    editor: {
      position: overrides.position || 0,
      quality_score: null,
      quality_issues: [],
      last_edited_at: '2025-01-01T00:00:00.000Z',
      last_edited_by: 'user-1',
      edit_count: 0,
    },
  });

  const createMockPoint = (overrides: Partial<{
    id: string;
    text: string;
    position: number;
  }> = {}) => ({
    id: overrides.id || 'chunk-1',
    payload: createMockPayload(overrides),
  });

  beforeEach(async () => {
    mockQdrantClient = {
      collectionExists: jest.fn().mockResolvedValue(true),
      getPoints: jest.fn(),
      countPoints: jest.fn().mockResolvedValue(10),
      scrollWithOrder: jest.fn(),
      upsertPoints: jest.fn().mockResolvedValue(undefined),
      deletePoints: jest.fn().mockResolvedValue(undefined),
      updatePayloads: jest.fn().mockResolvedValue(undefined),
    };

    mockLlmService = {
      generateEmbeddings: jest.fn().mockImplementation((texts: string[]) => {
        return Promise.resolve(texts.map(() => [...mockEmbedding]));
      }),
    };

    mockCollectionService = {
      findOne: jest.fn().mockResolvedValue({
        id: validCollectionId,
        name: 'Test Collection',
        description: 'Test description',
        createdBy: 'user-1',
        createdAt: '2025-01-01T00:00:00.000Z',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChunkService,
        { provide: QdrantClientService, useValue: mockQdrantClient },
        { provide: LlmService, useValue: mockLlmService },
        { provide: CollectionService, useValue: mockCollectionService },
      ],
    }).compile();

    service = module.get<ChunkService>(ChunkService);
  });

  describe('listChunks', () => {
    it('should list chunks with pagination', async () => {
      const mockPoints = [
        createMockPoint({ id: 'chunk-1', position: 0 }),
        createMockPoint({ id: 'chunk-2', position: 1 }),
      ];

      mockQdrantClient.scrollWithOrder.mockResolvedValue({
        points: mockPoints,
        nextOffset: null,
      });

      const result = await service.listChunks(validCollectionId, {
        limit: 20,
        offset: 0,
        sortBy: 'position',
        sortOrder: 'asc',
      });

      expect(result.chunks).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
      expect(mockQdrantClient.scrollWithOrder).toHaveBeenCalledWith(
        `kb_${validCollectionId}`,
        expect.objectContaining({
          limit: 20,
          offset: 0,
          orderBy: {
            field: 'editor.position',
            direction: 'asc',
          },
        }),
      );
    });

    it('should throw NotFoundException when collection does not exist', async () => {
      mockQdrantClient.collectionExists.mockResolvedValue(false);

      await expect(
        service.listChunks(validCollectionId, {
          limit: 20,
          offset: 0,
          sortBy: 'position',
          sortOrder: 'asc',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getChunk', () => {
    it('should return chunk by ID', async () => {
      const mockPoint = createMockPoint({ id: 'chunk-1' });
      mockQdrantClient.getPoints.mockResolvedValue([mockPoint]);

      const result = await service.getChunk(validCollectionId, 'chunk-1');

      expect(result.id).toBe('chunk-1');
      expect(result.content).toBe('Test chunk content');
      expect(mockQdrantClient.getPoints).toHaveBeenCalledWith(
        `kb_${validCollectionId}`,
        ['chunk-1'],
      );
    });

    it('should throw NotFoundException when chunk does not exist', async () => {
      mockQdrantClient.getPoints.mockResolvedValue([]);

      await expect(
        service.getChunk(validCollectionId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createChunk', () => {
    it('should create a new chunk with embedding', async () => {
      const dto = {
        content: 'New chunk content',
        chunkType: 'knowledge' as const,
        headingPath: ['New Section'],
        tags: ['new'],
      };

      const result = await service.createChunk(validCollectionId, dto, 'user-1');

      expect(mockLlmService.generateEmbeddings).toHaveBeenCalledWith(
        ['New chunk content'],
        expect.stringContaining('create_chunk'),
      );
      expect(mockQdrantClient.upsertPoints).toHaveBeenCalledWith(
        `kb_${validCollectionId}`,
        expect.arrayContaining([
          expect.objectContaining({
            vector: mockEmbedding,
            payload: expect.objectContaining({
              chunk: expect.objectContaining({
                text: 'New chunk content',
                type: 'knowledge',
              }),
            }),
          }),
        ]),
      );
      expect(result.content).toBe('New chunk content');
    });

    it('should assign position at end when not specified', async () => {
      mockQdrantClient.countPoints.mockResolvedValue(5);

      const dto = {
        content: 'New chunk',
        chunkType: 'knowledge' as const,
        headingPath: [],
        tags: [],
      };

      await service.createChunk(validCollectionId, dto, 'user-1');

      expect(mockQdrantClient.upsertPoints).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            payload: expect.objectContaining({
              editor: expect.objectContaining({
                position: 5,
              }),
            }),
          }),
        ]),
      );
    });
  });

  describe('updateChunk', () => {
    it('should update chunk content and regenerate embedding', async () => {
      const existingPoint = createMockPoint({ id: 'chunk-1' });
      mockQdrantClient.getPoints.mockResolvedValue([existingPoint]);

      const dto = {
        content: 'Updated content',
      };

      await service.updateChunk(validCollectionId, 'chunk-1', dto, 'user-1');

      expect(mockLlmService.generateEmbeddings).toHaveBeenCalledWith(
        ['Updated content'],
        expect.stringContaining('update_chunk'),
      );
      expect(mockQdrantClient.upsertPoints).toHaveBeenCalled();
    });

    it('should use partial update when content unchanged', async () => {
      const existingPoint = createMockPoint({ id: 'chunk-1', text: 'Original content' });
      mockQdrantClient.getPoints.mockResolvedValue([existingPoint]);

      const dto = {
        tags: ['updated-tag'],
      };

      await service.updateChunk(validCollectionId, 'chunk-1', dto, 'user-1');

      expect(mockLlmService.generateEmbeddings).not.toHaveBeenCalled();
      expect(mockQdrantClient.updatePayloads).toHaveBeenCalled();
    });
  });

  describe('deleteChunk', () => {
    it('should delete chunk from collection', async () => {
      mockQdrantClient.getPoints.mockResolvedValue([createMockPoint({ id: 'chunk-1' })]);

      await service.deleteChunk(validCollectionId, 'chunk-1', 'user-1');

      expect(mockQdrantClient.deletePoints).toHaveBeenCalledWith(
        `kb_${validCollectionId}`,
        ['chunk-1'],
      );
    });

    it('should throw NotFoundException when chunk does not exist', async () => {
      mockQdrantClient.getPoints.mockResolvedValue([]);

      await expect(
        service.deleteChunk(validCollectionId, 'non-existent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('splitChunk', () => {
    it('should split chunk at specified positions', async () => {
      const existingPoint = createMockPoint({
        id: 'chunk-1',
        text: 'First part. Second part. Third part.',
      });
      mockQdrantClient.getPoints.mockResolvedValue([existingPoint]);

      const dto = {
        splitPoints: [12, 26], // Split at "First part. " and "Second part. "
      };

      const result = await service.splitChunk(
        validCollectionId,
        'chunk-1',
        dto,
        'user-1',
      );

      expect(result.chunks.length).toBeGreaterThanOrEqual(2);
      expect(mockQdrantClient.deletePoints).toHaveBeenCalledWith(
        `kb_${validCollectionId}`,
        ['chunk-1'],
      );
      expect(mockQdrantClient.upsertPoints).toHaveBeenCalled();
    });

    it('should split chunk with explicit text blocks', async () => {
      mockQdrantClient.getPoints.mockResolvedValue([createMockPoint({ id: 'chunk-1' })]);

      const dto = {
        newTextBlocks: ['First block', 'Second block', 'Third block'],
      };

      const result = await service.splitChunk(
        validCollectionId,
        'chunk-1',
        dto,
        'user-1',
      );

      expect(result.chunks).toHaveLength(3);
      expect(mockLlmService.generateEmbeddings).toHaveBeenCalledWith(
        ['First block', 'Second block', 'Third block'],
        expect.stringContaining('split_chunk'),
      );
    });

    it('should throw BadRequestException when split results in single chunk', async () => {
      mockQdrantClient.getPoints.mockResolvedValue([
        createMockPoint({ id: 'chunk-1', text: 'Short' }),
      ]);

      const dto = {
        splitPoints: [1000], // Beyond text length
      };

      await expect(
        service.splitChunk(validCollectionId, 'chunk-1', dto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('mergeChunks', () => {
    it('should merge multiple chunks into one', async () => {
      const chunk1 = createMockPoint({ id: 'chunk-1', text: 'First chunk', position: 0 });
      const chunk2 = createMockPoint({ id: 'chunk-2', text: 'Second chunk', position: 1 });

      mockQdrantClient.getPoints
        .mockResolvedValueOnce([chunk1])
        .mockResolvedValueOnce([chunk2]);

      const dto = {
        chunkIds: ['chunk-1', 'chunk-2'],
        separator: '\n\n',
      };

      const result = await service.mergeChunks(validCollectionId, dto, 'user-1');

      expect(result.content).toBe('First chunk\n\nSecond chunk');
      expect(mockQdrantClient.deletePoints).toHaveBeenCalledWith(
        `kb_${validCollectionId}`,
        ['chunk-1', 'chunk-2'],
      );
      expect(mockQdrantClient.upsertPoints).toHaveBeenCalled();
    });

    it('should throw NotFoundException when chunk does not exist', async () => {
      mockQdrantClient.getPoints.mockResolvedValueOnce([]);

      await expect(
        service.mergeChunks(
          validCollectionId,
          { chunkIds: ['non-existent', 'chunk-2'], separator: '' },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorderChunks', () => {
    it('should update positions for multiple chunks', async () => {
      mockQdrantClient.getPoints
        .mockResolvedValueOnce([createMockPoint({ id: 'chunk-1' })])
        .mockResolvedValueOnce([createMockPoint({ id: 'chunk-2' })])
        .mockResolvedValueOnce([createMockPoint({ id: 'chunk-3' })]);

      const dto = {
        chunkPositions: [
          { chunkId: 'chunk-1', position: 2 },
          { chunkId: 'chunk-2', position: 0 },
          { chunkId: 'chunk-3', position: 1 },
        ],
      };

      await service.reorderChunks(validCollectionId, dto, 'user-1');

      expect(mockQdrantClient.updatePayloads).toHaveBeenCalledWith(
        `kb_${validCollectionId}`,
        expect.arrayContaining([
          expect.objectContaining({
            id: 'chunk-1',
            payload: expect.objectContaining({
              'editor.position': 2,
            }),
          }),
          expect.objectContaining({
            id: 'chunk-2',
            payload: expect.objectContaining({
              'editor.position': 0,
            }),
          }),
        ]),
      );
    });
  });

  describe('updateQualityScore', () => {
    it('should update quality score and issues', async () => {
      mockQdrantClient.getPoints.mockResolvedValue([createMockPoint({ id: 'chunk-1' })]);

      const dto = {
        score: 85,
        issues: ['Minor clarity issue'],
      };

      await service.updateQualityScore(validCollectionId, 'chunk-1', dto, 'user-1');

      expect(mockQdrantClient.updatePayloads).toHaveBeenCalledWith(
        `kb_${validCollectionId}`,
        [
          expect.objectContaining({
            id: 'chunk-1',
            payload: expect.objectContaining({
              'editor.quality_score': 85,
              'editor.quality_issues': ['Minor clarity issue'],
            }),
          }),
        ],
      );
    });
  });
});
