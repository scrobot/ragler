import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { IngestService, SessionData } from '@ingest/ingest.service';
import { RedisService } from '@infrastructure/redis';
import { IngestStrategyResolver } from '@ingest/strategies/ingest-strategy.resolver';
import { ConfigService } from '@nestjs/config';
import { LlmService } from '@llm/llm.service';

// Mock uuid to return predictable values
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

describe('IngestService', () => {
  let service: IngestService;
  let mockRedisService: jest.Mocked<Pick<RedisService, 'getJson' | 'setJson' | 'del' | 'scanKeys'>>;
  let mockStrategyResolver: jest.Mocked<IngestStrategyResolver>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockLlmService: jest.Mocked<Pick<LlmService, 'chunkContent'>>;
  let mockStrategy: any;

  const mockChunks = [
    { id: 'temp_1', text: 'First chunk', isDirty: false },
    { id: 'temp_2', text: 'Second chunk', isDirty: false },
  ];

  const createMockSession = (overrides: Partial<SessionData> = {}): SessionData => ({
    sessionId: 'session_test-uuid-1234',
    sourceUrl: 'https://example.com/test',
    sourceType: 'web',
    userId: 'user-1',
    status: 'DRAFT',
    content: 'Test content',
    chunks: mockChunks,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  });

  beforeEach(async () => {
    mockRedisService = {
      getJson: jest.fn(),
      setJson: jest.fn(),
      del: jest.fn(),
      scanKeys: jest.fn(),
    };

    mockStrategy = {
      ingest: jest.fn(),
    };

    mockStrategyResolver = {
      resolve: jest.fn().mockReturnValue(mockStrategy),
    } as unknown as jest.Mocked<IngestStrategyResolver>;

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'session.ttl') return 86400;
        return null;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    mockLlmService = {
      chunkContent: jest.fn().mockResolvedValue(mockChunks),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: IngestStrategyResolver, useValue: mockStrategyResolver },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: LlmService, useValue: mockLlmService },
      ],
    }).compile();

    service = module.get<IngestService>(IngestService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ingestManual', () => {
    it('should create session with manual content and generate chunks', async () => {
      mockStrategy.ingest.mockResolvedValue({
        content: 'My manual content',
        sourceUrl: 'manual://abc123',
      });

      const result = await service.ingestManual(
        { content: 'My manual content' },
        'user-1',
      );

      expect(mockStrategyResolver.resolve).toHaveBeenCalledWith('manual');
      expect(mockStrategy.ingest).toHaveBeenCalledWith('My manual content');
      expect(mockLlmService.chunkContent).toHaveBeenCalledWith(
        'My manual content',
        'session_test-uuid-1234',
      );

      expect(mockRedisService.setJson).toHaveBeenCalledWith(
        'session:session_test-uuid-1234',
        expect.objectContaining({
          sessionId: 'session_test-uuid-1234',
          sourceType: 'manual',
          sourceUrl: 'manual://abc123',
          userId: 'user-1',
          status: 'DRAFT',
          content: 'My manual content',
          chunks: mockChunks,
        }),
        86400,
      );
      expect(result).toEqual({
        sessionId: 'session_test-uuid-1234',
        sourceType: 'manual',
        sourceUrl: 'manual://abc123',
        status: 'DRAFT',
        createdAt: expect.any(String),
      });
    });

    it('should propagate LLM chunking errors', async () => {
      mockStrategy.ingest.mockResolvedValue({
        content: 'My manual content',
        sourceUrl: 'manual://abc123',
      });
      mockLlmService.chunkContent.mockRejectedValue(new Error('LLM API error'));

      await expect(
        service.ingestManual({ content: 'My manual content' }, 'user-1'),
      ).rejects.toThrow('LLM API error');

      // Session should not be saved if chunking fails
      expect(mockRedisService.setJson).not.toHaveBeenCalled();
    });
  });

  describe('ingestConfluence', () => {
    it('should create session with confluence URL and generate chunks', async () => {
      mockStrategy.ingest.mockResolvedValue({
        content: 'Confluence content',
        sourceUrl: 'https://company.atlassian.net/wiki/page',
      });

      await service.ingestConfluence(
        { url: 'https://company.atlassian.net/wiki/page' },
        'user-1',
      );

      expect(mockStrategyResolver.resolve).toHaveBeenCalledWith('confluence');
      expect(mockStrategy.ingest).toHaveBeenCalledWith('https://company.atlassian.net/wiki/page');
      expect(mockLlmService.chunkContent).toHaveBeenCalledWith(
        'Confluence content',
        'session_test-uuid-1234',
      );

      expect(mockRedisService.setJson).toHaveBeenCalledWith(
        'session:session_test-uuid-1234',
        expect.objectContaining({
          sourceType: 'confluence',
          sourceUrl: 'https://company.atlassian.net/wiki/page',
          content: 'Confluence content',
          chunks: mockChunks,
        }),
        86400,
      );
    });

    it('should create session with confluence pageId', async () => {
      mockStrategy.ingest.mockResolvedValue({
        content: 'Confluence content from page',
        sourceUrl: 'https://company.atlassian.net/wiki/spaces/SPACE/pages/123456/Title',
      });

      const result = await service.ingestConfluence(
        { pageId: '123456' },
        'user-1',
      );

      expect(mockStrategyResolver.resolve).toHaveBeenCalledWith('confluence');
      expect(mockStrategy.ingest).toHaveBeenCalledWith('123456');

      expect(result).toEqual({
        sessionId: 'session_test-uuid-1234',
        sourceType: 'confluence',
        sourceUrl: 'https://company.atlassian.net/wiki/spaces/SPACE/pages/123456/Title',
        status: 'DRAFT',
        createdAt: expect.any(String),
      });
    });

    it('should prefer pageId over url when both provided', async () => {
      mockStrategy.ingest.mockResolvedValue({
        content: 'Content from pageId',
        sourceUrl: 'confluence://page/789',
      });

      await service.ingestConfluence(
        { pageId: '789', url: 'https://company.atlassian.net/wiki/page' },
        'user-1',
      );

      // Should use pageId, not URL
      expect(mockStrategy.ingest).toHaveBeenCalledWith('789');
    });
  });

  describe('ingestWeb', () => {
    it('should create session with web content and generate chunks', async () => {
      mockStrategy.ingest.mockResolvedValue({
        content: 'Web content',
        sourceUrl: 'https://example.com/docs',
      });

      await service.ingestWeb(
        { url: 'https://example.com/docs' },
        'user-1',
      );

      expect(mockStrategyResolver.resolve).toHaveBeenCalledWith('web');
      expect(mockStrategy.ingest).toHaveBeenCalledWith('https://example.com/docs');
      expect(mockLlmService.chunkContent).toHaveBeenCalledWith(
        'Web content',
        'session_test-uuid-1234',
      );

      expect(mockRedisService.setJson).toHaveBeenCalledWith(
        'session:session_test-uuid-1234',
        expect.objectContaining({
          sourceType: 'web',
          sourceUrl: 'https://example.com/docs',
          content: 'Web content',
          chunks: mockChunks,
        }),
        86400,
      );
    });
  });

  describe('session TTL', () => {
    it('should set correct TTL for session (24 hours)', async () => {
      mockStrategy.ingest.mockResolvedValue({
        content: 'Test content',
        sourceUrl: 'manual://input',
      });

      await service.ingestManual({ content: 'Test' }, 'user-1');

      expect(mockRedisService.setJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        86400, // 24 hours in seconds
      );
    });
  });

  describe('getSession', () => {
    it('should return session when it exists', async () => {
      const mockSession = createMockSession();
      mockRedisService.getJson.mockResolvedValue(mockSession);

      const result = await service.getSession('session_test-uuid-1234');

      expect(mockRedisService.getJson).toHaveBeenCalledWith('session:session_test-uuid-1234');
      expect(result).toEqual(mockSession);
    });

    it('should return null when session does not exist', async () => {
      mockRedisService.getJson.mockResolvedValue(null);

      const result = await service.getSession('nonexistent');

      expect(mockRedisService.getJson).toHaveBeenCalledWith('session:nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('should update session with partial data', async () => {
      const mockSession = createMockSession();
      mockRedisService.getJson.mockResolvedValue(mockSession);

      await service.updateSession('session_test-uuid-1234', { status: 'PREVIEW' });

      expect(mockRedisService.setJson).toHaveBeenCalledWith(
        'session:session_test-uuid-1234',
        expect.objectContaining({
          ...mockSession,
          status: 'PREVIEW',
          updatedAt: expect.any(String),
        }),
        86400,
      );
    });

    it('should update multiple fields at once', async () => {
      const mockSession = createMockSession();
      mockRedisService.getJson.mockResolvedValue(mockSession);

      await service.updateSession('session_test-uuid-1234', {
        status: 'PUBLISHED',
        chunks: [{ id: 'new_chunk', text: 'New text', isDirty: false }],
      });

      expect(mockRedisService.setJson).toHaveBeenCalledWith(
        'session:session_test-uuid-1234',
        expect.objectContaining({
          status: 'PUBLISHED',
          chunks: [{ id: 'new_chunk', text: 'New text', isDirty: false }],
        }),
        86400,
      );
    });

    it('should throw BadRequestException when session does not exist', async () => {
      mockRedisService.getJson.mockResolvedValue(null);

      await expect(
        service.updateSession('nonexistent', { status: 'PREVIEW' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateSession('nonexistent', { status: 'PREVIEW' }),
      ).rejects.toThrow('Session nonexistent not found');
    });

    it('should update the updatedAt timestamp', async () => {
      const mockSession = createMockSession({
        updatedAt: '2025-01-01T00:00:00.000Z',
      });
      mockRedisService.getJson.mockResolvedValue(mockSession);

      await service.updateSession('session_test-uuid-1234', { content: 'Updated content' });

      const setJsonCall = mockRedisService.setJson.mock.calls[0];
      const updatedSession = setJsonCall[1] as SessionData;
      expect(updatedSession.updatedAt).not.toBe('2025-01-01T00:00:00.000Z');
    });
  });

  describe('deleteSession', () => {
    it('should delete session from Redis', async () => {
      await service.deleteSession('session_test-uuid-1234');

      expect(mockRedisService.del).toHaveBeenCalledWith('session:session_test-uuid-1234');
    });

    it('should not throw when deleting non-existent session', async () => {
      await expect(service.deleteSession('nonexistent')).resolves.not.toThrow();

      expect(mockRedisService.del).toHaveBeenCalledWith('session:nonexistent');
    });
  });

  describe('listSessions', () => {
    it('should return all sessions sorted by createdAt descending', async () => {
      const session1 = createMockSession({
        sessionId: 'session_1',
        createdAt: '2025-01-01T00:00:00.000Z',
      });
      const session2 = createMockSession({
        sessionId: 'session_2',
        createdAt: '2025-01-02T00:00:00.000Z',
      });
      mockRedisService.scanKeys.mockResolvedValue(['session:session_1', 'session:session_2']);
      mockRedisService.getJson
        .mockResolvedValueOnce(session1)
        .mockResolvedValueOnce(session2);

      const result = await service.listSessions();

      expect(result).toHaveLength(2);
      expect(result[0].sessionId).toBe('session_2'); // Newer first
      expect(result[1].sessionId).toBe('session_1');
    });

    it('should return empty array when no sessions exist', async () => {
      mockRedisService.scanKeys.mockResolvedValue([]);

      const result = await service.listSessions();

      expect(result).toEqual([]);
    });
  });
});
