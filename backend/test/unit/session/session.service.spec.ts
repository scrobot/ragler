import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SessionService } from '@session/session.service';
import { IngestService, SessionData } from '@ingest/ingest.service';
import { QdrantClientService } from '@infrastructure/qdrant';
import { LlmService } from '@llm/llm.service';
import { UserRole } from '@common/decorators';
import { LlmEmbeddingApiError } from '@llm/errors/llm-embedding.errors';

describe('SessionService', () => {
  let service: SessionService;
  let mockIngestService: jest.Mocked<Pick<IngestService, 'getSession' | 'updateSession' | 'deleteSession'>>;
  let mockQdrantClient: jest.Mocked<Pick<QdrantClientService, 'collectionExists' | 'deletePointsByFilter' | 'upsertPoints'>>;
  let mockLlmService: jest.Mocked<Pick<LlmService, 'generateEmbeddings' | 'chunkContent'>>;

  const validCollectionId = '550e8400-e29b-41d4-a716-446655440000';
  const mockEmbedding = new Array(1536).fill(0.01);

  const createMockSession = (overrides: Partial<SessionData> = {}): SessionData => ({
    sessionId: 'session_test-123',
    sourceUrl: 'https://example.com/test',
    sourceType: 'web',
    userId: 'user-1',
    status: 'DRAFT',
    content: 'Test content',
    chunks: [
      { id: 'chunk_1', text: 'First chunk', isDirty: false },
      { id: 'chunk_2', text: 'Second chunk', isDirty: false },
      { id: 'chunk_3', text: 'Third chunk', isDirty: false },
    ],
    rawContent: '<html><body>Test content</body></html>',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  });

  beforeEach(async () => {
    mockIngestService = {
      getSession: jest.fn(),
      updateSession: jest.fn(),
      deleteSession: jest.fn(),
    };

    mockQdrantClient = {
      collectionExists: jest.fn(),
      deletePointsByFilter: jest.fn(),
      upsertPoints: jest.fn(),
    };

    mockLlmService = {
      generateEmbeddings: jest.fn().mockImplementation((texts: string[]) => {
        // Return an array of mock embeddings matching the input length
        return Promise.resolve(texts.map(() => [...mockEmbedding]));
      }),
      chunkContent: jest.fn().mockResolvedValue([
        { id: 'temp_1', text: 'First chunk', isDirty: false },
        { id: 'temp_2', text: 'Second chunk', isDirty: false },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: IngestService, useValue: mockIngestService },
        { provide: QdrantClientService, useValue: mockQdrantClient },
        { provide: LlmService, useValue: mockLlmService },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSession', () => {
    it('should return session when it exists', async () => {
      const mockSession = createMockSession();
      mockIngestService.getSession.mockResolvedValue(mockSession);

      const result = await service.getSession('session_test-123');

      expect(mockIngestService.getSession).toHaveBeenCalledWith('session_test-123');
      expect(result).toEqual({
        sessionId: mockSession.sessionId,
        sourceUrl: mockSession.sourceUrl,
        sourceType: mockSession.sourceType,
        status: mockSession.status,
        chunks: mockSession.chunks,
        rawContent: mockSession.rawContent,
        createdAt: mockSession.createdAt,
        updatedAt: mockSession.updatedAt,
      });
    });

    it('should throw NotFoundException when session does not exist', async () => {
      mockIngestService.getSession.mockResolvedValue(null);

      await expect(service.getSession('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.getSession('nonexistent')).rejects.toThrow('Session nonexistent not found');
    });
  });

  describe('mergeChunks', () => {
    it('should merge chunks and return updated session', async () => {
      const mockSession = createMockSession();
      mockIngestService.getSession.mockResolvedValue(mockSession);

      const result = await service.mergeChunks('session_test-123', {
        chunkIds: ['chunk_1', 'chunk_2'],
      });

      expect(mockIngestService.updateSession).toHaveBeenCalledWith(
        'session_test-123',
        expect.objectContaining({
          chunks: expect.arrayContaining([
            expect.objectContaining({ id: 'chunk_3', text: 'Third chunk' }),
            expect.objectContaining({ text: 'First chunk\n\nSecond chunk', isDirty: true }),
          ]),
        }),
      );
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when session does not exist', async () => {
      mockIngestService.getSession.mockResolvedValue(null);

      await expect(
        service.mergeChunks('nonexistent', { chunkIds: ['chunk_1', 'chunk_2'] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when session is not in DRAFT status', async () => {
      const mockSession = createMockSession({ status: 'PREVIEW' });
      mockIngestService.getSession.mockResolvedValue(mockSession);

      await expect(
        service.mergeChunks('session_test-123', { chunkIds: ['chunk_1', 'chunk_2'] }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.mergeChunks('session_test-123', { chunkIds: ['chunk_1', 'chunk_2'] }),
      ).rejects.toThrow('Cannot modify chunks in non-DRAFT status');
    });

    it('should throw BadRequestException when some chunk IDs are not found', async () => {
      const mockSession = createMockSession();
      mockIngestService.getSession.mockResolvedValue(mockSession);

      await expect(
        service.mergeChunks('session_test-123', { chunkIds: ['chunk_1', 'nonexistent'] }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.mergeChunks('session_test-123', { chunkIds: ['chunk_1', 'nonexistent'] }),
      ).rejects.toThrow('Some chunk IDs not found in session');
    });
  });

  describe('splitChunk', () => {
    it('should split chunk using newTextBlocks', async () => {
      const mockSession = createMockSession();
      mockIngestService.getSession.mockResolvedValue(mockSession);

      await service.splitChunk(
        'session_test-123',
        'chunk_1',
        { newTextBlocks: ['Part A', 'Part B', 'Part C'] },
        UserRole.DEV,
      );

      expect(mockIngestService.updateSession).toHaveBeenCalledWith(
        'session_test-123',
        expect.objectContaining({
          chunks: expect.arrayContaining([
            expect.objectContaining({ text: 'Part A', isDirty: true }),
            expect.objectContaining({ text: 'Part B', isDirty: true }),
            expect.objectContaining({ text: 'Part C', isDirty: true }),
            expect.objectContaining({ id: 'chunk_2' }),
            expect.objectContaining({ id: 'chunk_3' }),
          ]),
        }),
      );
    });

    it('should split chunk using splitPoints', async () => {
      const mockSession = createMockSession({
        chunks: [{ id: 'chunk_1', text: '0123456789', isDirty: false }],
      });
      mockIngestService.getSession.mockResolvedValue(mockSession);

      await service.splitChunk(
        'session_test-123',
        'chunk_1',
        { splitPoints: [3, 7] },
        UserRole.ML,
      );

      expect(mockIngestService.updateSession).toHaveBeenCalledWith(
        'session_test-123',
        expect.objectContaining({
          chunks: expect.arrayContaining([
            expect.objectContaining({ text: '012', isDirty: true }),
            expect.objectContaining({ text: '3456', isDirty: true }),
            expect.objectContaining({ text: '789', isDirty: true }),
          ]),
        }),
      );
    });

    it('should throw ForbiddenException for L2 users', async () => {
      await expect(
        service.splitChunk('session_test-123', 'chunk_1', { newTextBlocks: ['A', 'B'] }, UserRole.L2),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.splitChunk('session_test-123', 'chunk_1', { newTextBlocks: ['A', 'B'] }, UserRole.L2),
      ).rejects.toThrow('Split operation is not available in Simple Mode');
    });

    it('should throw NotFoundException when session does not exist', async () => {
      mockIngestService.getSession.mockResolvedValue(null);

      await expect(
        service.splitChunk('nonexistent', 'chunk_1', { newTextBlocks: ['A', 'B'] }, UserRole.DEV),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when session is not in DRAFT status', async () => {
      const mockSession = createMockSession({ status: 'PUBLISHED' });
      mockIngestService.getSession.mockResolvedValue(mockSession);

      await expect(
        service.splitChunk('session_test-123', 'chunk_1', { newTextBlocks: ['A', 'B'] }, UserRole.DEV),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.splitChunk('session_test-123', 'chunk_1', { newTextBlocks: ['A', 'B'] }, UserRole.DEV),
      ).rejects.toThrow('Cannot modify chunks in non-DRAFT status');
    });

    it('should throw NotFoundException when chunk does not exist', async () => {
      const mockSession = createMockSession();
      mockIngestService.getSession.mockResolvedValue(mockSession);

      await expect(
        service.splitChunk('session_test-123', 'nonexistent', { newTextBlocks: ['A', 'B'] }, UserRole.DEV),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.splitChunk('session_test-123', 'nonexistent', { newTextBlocks: ['A', 'B'] }, UserRole.DEV),
      ).rejects.toThrow('Chunk nonexistent not found in session');
    });

    it('should throw BadRequestException when neither splitPoints nor newTextBlocks provided', async () => {
      const mockSession = createMockSession();
      mockIngestService.getSession.mockResolvedValue(mockSession);

      await expect(
        service.splitChunk('session_test-123', 'chunk_1', {}, UserRole.DEV),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.splitChunk('session_test-123', 'chunk_1', {}, UserRole.DEV),
      ).rejects.toThrow('Either splitPoints or newTextBlocks must be provided');
    });

    it('should filter out empty chunks when splitting by splitPoints', async () => {
      const mockSession = createMockSession({
        chunks: [{ id: 'chunk_1', text: 'ab  cd', isDirty: false }],
      });
      mockIngestService.getSession.mockResolvedValue(mockSession);

      await service.splitChunk(
        'session_test-123',
        'chunk_1',
        { splitPoints: [2, 4] },
        UserRole.DEV,
      );

      const updateCall = mockIngestService.updateSession.mock.calls[0][1] as { chunks: Array<{ text: string }> };
      const nonEmptyChunks = updateCall.chunks.filter((c) => c.text.trim());
      expect(nonEmptyChunks.length).toBe(2);
    });
  });

  describe('updateChunk', () => {
    it('should update chunk text', async () => {
      const mockSession = createMockSession();
      mockIngestService.getSession.mockResolvedValue(mockSession);

      await service.updateChunk('session_test-123', 'chunk_1', { text: 'Updated text' });

      expect(mockIngestService.updateSession).toHaveBeenCalledWith(
        'session_test-123',
        expect.objectContaining({
          chunks: expect.arrayContaining([
            expect.objectContaining({ id: 'chunk_1', text: 'Updated text', isDirty: true }),
          ]),
        }),
      );
    });

    it('should throw NotFoundException when session does not exist', async () => {
      mockIngestService.getSession.mockResolvedValue(null);

      await expect(
        service.updateChunk('nonexistent', 'chunk_1', { text: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when session is not in DRAFT status', async () => {
      const mockSession = createMockSession({ status: 'PREVIEW' });
      mockIngestService.getSession.mockResolvedValue(mockSession);

      await expect(
        service.updateChunk('session_test-123', 'chunk_1', { text: 'Updated' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateChunk('session_test-123', 'chunk_1', { text: 'Updated' }),
      ).rejects.toThrow('Cannot modify chunks in non-DRAFT status');
    });

    it('should throw NotFoundException when chunk does not exist', async () => {
      const mockSession = createMockSession();
      mockIngestService.getSession.mockResolvedValue(mockSession);

      await expect(
        service.updateChunk('session_test-123', 'nonexistent', { text: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateChunk('session_test-123', 'nonexistent', { text: 'Updated' }),
      ).rejects.toThrow('Chunk nonexistent not found in session');
    });
  });

  describe('preview', () => {
    it('should return preview with no warnings for valid session', async () => {
      const mockSession = createMockSession();
      mockIngestService.getSession.mockResolvedValue(mockSession);

      const result = await service.preview('session_test-123');

      expect(mockIngestService.updateSession).toHaveBeenCalledWith('session_test-123', { status: 'PREVIEW' });
      expect(result).toEqual({
        sessionId: 'session_test-123',
        status: 'PREVIEW',
        chunks: mockSession.chunks,
        isValid: true,
        warnings: [],
      });
    });

    it('should return warning for empty chunks array', async () => {
      const mockSession = createMockSession({ chunks: [] });
      mockIngestService.getSession.mockResolvedValue(mockSession);

      const result = await service.preview('session_test-123');

      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('No chunks to publish');
    });

    it('should return warning for empty chunk text', async () => {
      const mockSession = createMockSession({
        chunks: [
          { id: 'chunk_1', text: 'Valid text', isDirty: false },
          { id: 'chunk_2', text: '   ', isDirty: false },
          { id: 'chunk_3', text: '', isDirty: false },
        ],
      });
      mockIngestService.getSession.mockResolvedValue(mockSession);

      const result = await service.preview('session_test-123');

      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('2 empty chunks found');
    });

    it('should throw NotFoundException when session does not exist', async () => {
      mockIngestService.getSession.mockResolvedValue(null);

      await expect(service.preview('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('publish', () => {
    it('should publish chunks to collection and delete session', async () => {
      const mockSession = createMockSession();
      mockIngestService.getSession.mockResolvedValue(mockSession);
      mockQdrantClient.collectionExists.mockResolvedValue(true);

      const result = await service.publish(
        'session_test-123',
        { targetCollectionId: validCollectionId },
        'user-1',
      );

      expect(mockQdrantClient.collectionExists).toHaveBeenCalledWith(`kb_${validCollectionId}`);
      expect(mockQdrantClient.deletePointsByFilter).toHaveBeenCalledWith(
        `kb_${validCollectionId}`,
        expect.objectContaining({
          must: expect.arrayContaining([
            expect.objectContaining({ key: 'source_id' }),
          ]),
        }),
      );
      expect(mockQdrantClient.upsertPoints).toHaveBeenCalled();
      expect(mockIngestService.deleteSession).toHaveBeenCalledWith('session_test-123');
      expect(result).toEqual({
        sessionId: 'session_test-123',
        publishedChunks: 3,
        collectionId: validCollectionId,
      });
    });

    it('should throw NotFoundException when session does not exist', async () => {
      mockIngestService.getSession.mockResolvedValue(null);

      await expect(
        service.publish('nonexistent', { targetCollectionId: validCollectionId }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when collection does not exist', async () => {
      const mockSession = createMockSession();
      mockIngestService.getSession.mockResolvedValue(mockSession);
      mockQdrantClient.collectionExists.mockResolvedValue(false);

      await expect(
        service.publish('session_test-123', { targetCollectionId: validCollectionId }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.publish('session_test-123', { targetCollectionId: validCollectionId }, 'user-1'),
      ).rejects.toThrow(`Collection ${validCollectionId} not found`);
    });

    it('should filter out empty chunks when publishing', async () => {
      const mockSession = createMockSession({
        chunks: [
          { id: 'chunk_1', text: 'Valid text', isDirty: false },
          { id: 'chunk_2', text: '   ', isDirty: false },
          { id: 'chunk_3', text: '', isDirty: false },
        ],
      });
      mockIngestService.getSession.mockResolvedValue(mockSession);
      mockQdrantClient.collectionExists.mockResolvedValue(true);

      const result = await service.publish(
        'session_test-123',
        { targetCollectionId: validCollectionId },
        'user-1',
      );

      expect(result.publishedChunks).toBe(1);
    });

    it('should not call upsertPoints when all chunks are empty', async () => {
      const mockSession = createMockSession({
        chunks: [
          { id: 'chunk_1', text: '', isDirty: false },
          { id: 'chunk_2', text: '   ', isDirty: false },
        ],
      });
      mockIngestService.getSession.mockResolvedValue(mockSession);
      mockQdrantClient.collectionExists.mockResolvedValue(true);

      const result = await service.publish(
        'session_test-123',
        { targetCollectionId: validCollectionId },
        'user-1',
      );

      expect(mockQdrantClient.upsertPoints).not.toHaveBeenCalled();
      expect(result.publishedChunks).toBe(0);
    });

    it('should include correct payload in upserted points', async () => {
      const mockSession = createMockSession({
        chunks: [{ id: 'chunk_1', text: 'Test content', isDirty: false }],
      });
      mockIngestService.getSession.mockResolvedValue(mockSession);
      mockQdrantClient.collectionExists.mockResolvedValue(true);

      await service.publish(
        'session_test-123',
        { targetCollectionId: validCollectionId },
        'user-1',
      );

      const upsertCall = mockQdrantClient.upsertPoints.mock.calls[0];
      const points = upsertCall[1];

      expect(points).toHaveLength(1);
      expect(points[0].payload).toMatchObject({
        content: 'Test content',
        source_url: mockSession.sourceUrl,
        source_type: mockSession.sourceType,
        last_modified_by: 'user-1',
        revision: 1,
      });
      expect(points[0].payload.source_id).toBeDefined();
      expect(points[0].payload.last_modified_at).toBeDefined();
    });

    describe('embedding generation', () => {
      it('should generate embeddings for each chunk before upserting', async () => {
        const mockSession = createMockSession({
          chunks: [
            { id: 'chunk_1', text: 'First chunk', isDirty: false },
            { id: 'chunk_2', text: 'Second chunk', isDirty: false },
          ],
        });
        mockIngestService.getSession.mockResolvedValue(mockSession);
        mockQdrantClient.collectionExists.mockResolvedValue(true);
        mockLlmService.generateEmbeddings.mockResolvedValue([
          mockEmbedding,
          mockEmbedding,
        ]);

        await service.publish(
          'session_test-123',
          { targetCollectionId: validCollectionId },
          'user-1',
        );

        expect(mockLlmService.generateEmbeddings).toHaveBeenCalledWith(
          ['First chunk', 'Second chunk'],
          'session_test-123',
        );
      });

      it('should use real embeddings in upserted points', async () => {
        const mockSession = createMockSession({
          chunks: [{ id: 'chunk_1', text: 'Test content', isDirty: false }],
        });
        const testEmbedding = new Array(1536).fill(0.123);
        mockIngestService.getSession.mockResolvedValue(mockSession);
        mockQdrantClient.collectionExists.mockResolvedValue(true);
        mockLlmService.generateEmbeddings.mockResolvedValue([testEmbedding]);

        await service.publish(
          'session_test-123',
          { targetCollectionId: validCollectionId },
          'user-1',
        );

        const upsertCall = mockQdrantClient.upsertPoints.mock.calls[0];
        const points = upsertCall[1];

        expect(points[0].vector).toEqual(testEmbedding);
      });

      it('should fail publish if embedding generation fails', async () => {
        const mockSession = createMockSession();
        mockIngestService.getSession.mockResolvedValue(mockSession);
        mockQdrantClient.collectionExists.mockResolvedValue(true);
        mockLlmService.generateEmbeddings.mockRejectedValue(
          new LlmEmbeddingApiError('OpenAI rate limit exceeded', true),
        );

        await expect(
          service.publish(
            'session_test-123',
            { targetCollectionId: validCollectionId },
            'user-1',
          ),
        ).rejects.toThrow(LlmEmbeddingApiError);
      });

      it('should NOT delete old chunks if embedding generation fails', async () => {
        const mockSession = createMockSession();
        mockIngestService.getSession.mockResolvedValue(mockSession);
        mockQdrantClient.collectionExists.mockResolvedValue(true);
        mockLlmService.generateEmbeddings.mockRejectedValue(
          new LlmEmbeddingApiError('Server error', true),
        );

        await expect(
          service.publish(
            'session_test-123',
            { targetCollectionId: validCollectionId },
            'user-1',
          ),
        ).rejects.toThrow();

        expect(mockQdrantClient.deletePointsByFilter).not.toHaveBeenCalled();
        expect(mockQdrantClient.upsertPoints).not.toHaveBeenCalled();
      });

      it('should not call generateEmbeddings when all chunks are empty', async () => {
        const mockSession = createMockSession({
          chunks: [
            { id: 'chunk_1', text: '', isDirty: false },
            { id: 'chunk_2', text: '   ', isDirty: false },
          ],
        });
        mockIngestService.getSession.mockResolvedValue(mockSession);
        mockQdrantClient.collectionExists.mockResolvedValue(true);

        await service.publish(
          'session_test-123',
          { targetCollectionId: validCollectionId },
          'user-1',
        );

        expect(mockLlmService.generateEmbeddings).not.toHaveBeenCalled();
      });
    });
  });

  describe('deleteSession', () => {
    it('should delete DRAFT session and return success response', async () => {
      const mockSession = createMockSession({ status: 'DRAFT' });
      mockIngestService.getSession.mockResolvedValue(mockSession);
      mockIngestService.deleteSession.mockResolvedValue(undefined);

      const result = await service.deleteSession('session_test-123', 'user-1');

      expect(mockIngestService.getSession).toHaveBeenCalledWith('session_test-123');
      expect(mockIngestService.deleteSession).toHaveBeenCalledWith('session_test-123');
      expect(result).toEqual({
        sessionId: 'session_test-123',
        deleted: true,
      });
    });

    it('should delete PREVIEW session and return success response', async () => {
      const mockSession = createMockSession({ status: 'PREVIEW' });
      mockIngestService.getSession.mockResolvedValue(mockSession);
      mockIngestService.deleteSession.mockResolvedValue(undefined);

      const result = await service.deleteSession('session_test-123', 'user-1');

      expect(mockIngestService.deleteSession).toHaveBeenCalledWith('session_test-123');
      expect(result).toEqual({
        sessionId: 'session_test-123',
        deleted: true,
      });
    });

    it('should throw NotFoundException when session does not exist', async () => {
      mockIngestService.getSession.mockResolvedValue(null);

      await expect(
        service.deleteSession('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.deleteSession('nonexistent', 'user-1'),
      ).rejects.toThrow('Session nonexistent not found');
    });

    it('should throw BadRequestException when session is PUBLISHED', async () => {
      const mockSession = createMockSession({ status: 'PUBLISHED' });
      mockIngestService.getSession.mockResolvedValue(mockSession);

      await expect(
        service.deleteSession('session_test-123', 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.deleteSession('session_test-123', 'user-1'),
      ).rejects.toThrow('Cannot delete a published session');
    });

    it('should not call deleteSession when session not found', async () => {
      mockIngestService.getSession.mockResolvedValue(null);

      await expect(
        service.deleteSession('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);

      expect(mockIngestService.deleteSession).not.toHaveBeenCalled();
    });
  });

  describe('generateChunks', () => {
    it('should generate chunks from session content using LLM', async () => {
      const generatedChunks = [
        { id: 'temp_1', text: 'This is test content', isDirty: false },
        { id: 'temp_2', text: 'for chunking.', isDirty: false },
      ];
      const mockSession = createMockSession({
        content: 'This is test content for chunking.',
        chunks: [],
      });
      const updatedSession = createMockSession({
        content: 'This is test content for chunking.',
        chunks: generatedChunks,
      });
      // First call returns original session, second call (after update) returns updated session
      mockIngestService.getSession
        .mockResolvedValueOnce(mockSession)
        .mockResolvedValueOnce(updatedSession);
      mockLlmService.chunkContent.mockResolvedValue(generatedChunks);

      const result = await service.generateChunks('session_test-123', 'user-1');

      expect(mockLlmService.chunkContent).toHaveBeenCalledWith(
        'This is test content for chunking.',
        'session_test-123',
      );
      expect(mockIngestService.updateSession).toHaveBeenCalledWith(
        'session_test-123',
        expect.objectContaining({
          chunks: generatedChunks,
        }),
      );
      expect(result.chunks).toHaveLength(2);
      expect(result.chunks).toEqual(generatedChunks);
    });

    it('should throw NotFoundException when session does not exist', async () => {
      mockIngestService.getSession.mockResolvedValue(null);

      await expect(
        service.generateChunks('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.generateChunks('nonexistent', 'user-1'),
      ).rejects.toThrow('Session nonexistent not found');
    });

    it('should throw BadRequestException when session is not in DRAFT status', async () => {
      const mockSession = createMockSession({ status: 'PREVIEW' });
      mockIngestService.getSession.mockResolvedValue(mockSession);

      await expect(
        service.generateChunks('session_test-123', 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.generateChunks('session_test-123', 'user-1'),
      ).rejects.toThrow('Cannot generate chunks in non-DRAFT status');
    });

    it('should throw BadRequestException when session has no content', async () => {
      const mockSession = createMockSession({ content: '' });
      mockIngestService.getSession.mockResolvedValue(mockSession);

      await expect(
        service.generateChunks('session_test-123', 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.generateChunks('session_test-123', 'user-1'),
      ).rejects.toThrow('Session has no content to chunk');
    });

    it('should propagate LLM service errors', async () => {
      const mockSession = createMockSession({ chunks: [] });
      mockIngestService.getSession.mockResolvedValue(mockSession);
      mockLlmService.chunkContent.mockRejectedValue(new Error('LLM API error'));

      await expect(
        service.generateChunks('session_test-123', 'user-1'),
      ).rejects.toThrow('LLM API error');
    });
  });
});
