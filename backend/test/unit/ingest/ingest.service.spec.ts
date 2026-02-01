import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { IngestService, SessionData } from '../../../src/modules/ingest/ingest.service';
import { RedisService } from '../../../src/infrastructure/redis';
import { ConfluenceStrategy } from '../../../src/modules/ingest/strategies/confluence.strategy';
import { WebStrategy } from '../../../src/modules/ingest/strategies/web.strategy';

import { ConfigService } from '@nestjs/config';

// Mock uuid to return predictable values
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

describe('IngestService', () => {
  let service: IngestService;
  let mockRedisService: jest.Mocked<Pick<RedisService, 'getJson' | 'setJson' | 'del'>>;
  let mockConfluenceStrategy: jest.Mocked<ConfluenceStrategy>;
  let mockWebStrategy: jest.Mocked<WebStrategy>;
  let mockConfigService: jest.Mocked<ConfigService>;

  const createMockSession = (overrides: Partial<SessionData> = {}): SessionData => ({
    sessionId: 'session_test-uuid-1234',
    sourceUrl: 'https://example.com/test',
    sourceType: 'web',
    userId: 'user-1',
    status: 'DRAFT',
    content: 'Test content',
    chunks: [
      { id: 'chunk_1', text: 'First chunk', isDirty: false },
      { id: 'chunk_2', text: 'Second chunk', isDirty: false },
    ],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  });

  beforeEach(async () => {
    mockRedisService = {
      getJson: jest.fn(),
      setJson: jest.fn(),
      del: jest.fn(),
    };

    mockConfluenceStrategy = {
      ingest: jest.fn(),
    } as unknown as jest.Mocked<ConfluenceStrategy>;

    mockWebStrategy = {
      ingest: jest.fn(),
    } as unknown as jest.Mocked<WebStrategy>;

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'session.ttl') return 86400;
        return null;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfluenceStrategy, useValue: mockConfluenceStrategy },
        { provide: WebStrategy, useValue: mockWebStrategy },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<IngestService>(IngestService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ingest', () => {
    describe('manual source type', () => {
      it('should create session with manual content', async () => {
        const result = await service.ingest(
          { sourceType: 'manual', content: 'My manual content' },
          'user-1',
        );

        expect(mockRedisService.setJson).toHaveBeenCalledWith(
          'session:session_test-uuid-1234',
          expect.objectContaining({
            sessionId: 'session_test-uuid-1234',
            sourceType: 'manual',
            sourceUrl: 'manual://input',
            userId: 'user-1',
            status: 'DRAFT',
            content: 'My manual content',
            chunks: [],
          }),
          86400, // 24 hours TTL
        );
        expect(result).toEqual({
          sessionId: 'session_test-uuid-1234',
          sourceType: 'manual',
          sourceUrl: 'manual://input',
          status: 'DRAFT',
          createdAt: expect.any(String),
        });
      });

      it('should throw BadRequestException when content is missing for manual type', async () => {
        await expect(
          service.ingest({ sourceType: 'manual' }, 'user-1'),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.ingest({ sourceType: 'manual' }, 'user-1'),
        ).rejects.toThrow('Content is required for manual source type');
      });

      it('should throw BadRequestException when content is empty string for manual type', async () => {
        await expect(
          service.ingest({ sourceType: 'manual', content: '' }, 'user-1'),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('confluence source type', () => {
      it('should create session with confluence placeholder content', async () => {
        const result = await service.ingest(
          { sourceType: 'confluence', url: 'https://company.atlassian.net/wiki/page' },
          'user-1',
        );

        expect(mockRedisService.setJson).toHaveBeenCalledWith(
          'session:session_test-uuid-1234',
          expect.objectContaining({
            sourceType: 'confluence',
            sourceUrl: 'https://company.atlassian.net/wiki/page',
            content: '[Placeholder] Content from Confluence: https://company.atlassian.net/wiki/page',
          }),
          86400,
        );
        expect(result.sourceType).toBe('confluence');
        expect(result.sourceUrl).toBe('https://company.atlassian.net/wiki/page');
      });

      it('should throw BadRequestException when URL is missing for confluence type', async () => {
        await expect(
          service.ingest({ sourceType: 'confluence' }, 'user-1'),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.ingest({ sourceType: 'confluence' }, 'user-1'),
        ).rejects.toThrow('URL is required for confluence source type');
      });
    });

    describe('web source type', () => {
      it('should create session with web placeholder content', async () => {
        const result = await service.ingest(
          { sourceType: 'web', url: 'https://example.com/docs' },
          'user-1',
        );

        expect(mockRedisService.setJson).toHaveBeenCalledWith(
          'session:session_test-uuid-1234',
          expect.objectContaining({
            sourceType: 'web',
            sourceUrl: 'https://example.com/docs',
            content: '[Placeholder] Content from web: https://example.com/docs',
          }),
          86400,
        );
        expect(result.sourceType).toBe('web');
        expect(result.sourceUrl).toBe('https://example.com/docs');
      });

      it('should throw BadRequestException when URL is missing for web type', async () => {
        await expect(
          service.ingest({ sourceType: 'web' }, 'user-1'),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.ingest({ sourceType: 'web' }, 'user-1'),
        ).rejects.toThrow('URL is required for web source type');
      });
    });

    it('should set correct TTL for session (24 hours)', async () => {
      await service.ingest({ sourceType: 'manual', content: 'Test' }, 'user-1');

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
});
