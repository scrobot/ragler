import { Test, TestingModule } from '@nestjs/testing';
import { SessionController } from '@session/session.controller';
import { SessionService } from '@session/session.service';
import { UserRole, RequestUser } from '@common/decorators';
import {
  SessionResponseDto,
  PreviewResponseDto,
  PublishResponseDto,
} from '../../../src/modules/session/dto';

describe('SessionController', () => {
  let controller: SessionController;
  let mockSessionService: jest.Mocked<SessionService>;

  const mockSessionResponse: SessionResponseDto = {
    sessionId: 'session_test-123',
    sourceUrl: 'https://example.com/test',
    status: 'DRAFT',
    chunks: [
      { id: 'chunk_1', text: 'First chunk', isDirty: false },
      { id: 'chunk_2', text: 'Second chunk', isDirty: false },
    ],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  const mockPreviewResponse: PreviewResponseDto = {
    sessionId: 'session_test-123',
    status: 'PREVIEW',
    chunks: mockSessionResponse.chunks,
    isValid: true,
    warnings: [],
  };

  const mockPublishResponse: PublishResponseDto = {
    sessionId: 'session_test-123',
    publishedChunks: 2,
    collectionId: '550e8400-e29b-41d4-a716-446655440000',
  };

  beforeEach(async () => {
    mockSessionService = {
      getSession: jest.fn(),
      mergeChunks: jest.fn(),
      splitChunk: jest.fn(),
      updateChunk: jest.fn(),
      preview: jest.fn(),
      publish: jest.fn(),
    } as unknown as jest.Mocked<SessionService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    controller = module.get<SessionController>(SessionController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSession', () => {
    it('should call service.getSession with correct id', async () => {
      mockSessionService.getSession.mockResolvedValue(mockSessionResponse);

      const result = await controller.getSession('session_test-123');

      expect(mockSessionService.getSession).toHaveBeenCalledWith('session_test-123');
      expect(result).toEqual(mockSessionResponse);
    });
  });

  describe('mergeChunks', () => {
    it('should call service.mergeChunks with correct parameters', async () => {
      const mergeDto = { chunkIds: ['chunk_1', 'chunk_2'] };
      mockSessionService.mergeChunks.mockResolvedValue(mockSessionResponse);

      const result = await controller.mergeChunks('session_test-123', mergeDto);

      expect(mockSessionService.mergeChunks).toHaveBeenCalledWith('session_test-123', mergeDto);
      expect(result).toEqual(mockSessionResponse);
    });
  });

  describe('splitChunk', () => {
    it('should call service.splitChunk with correct parameters', async () => {
      const splitDto = { newTextBlocks: ['Part A', 'Part B'] };
      mockSessionService.splitChunk.mockResolvedValue(mockSessionResponse);

      const result = await controller.splitChunk(
        'session_test-123',
        'chunk_1',
        splitDto,
        UserRole.DEV,
      );

      expect(mockSessionService.splitChunk).toHaveBeenCalledWith(
        'session_test-123',
        'chunk_1',
        splitDto,
        UserRole.DEV,
      );
      expect(result).toEqual(mockSessionResponse);
    });

    it('should pass ML role to service', async () => {
      const splitDto = { splitPoints: [5, 10] };
      mockSessionService.splitChunk.mockResolvedValue(mockSessionResponse);

      await controller.splitChunk('session_test-123', 'chunk_1', splitDto, UserRole.ML);

      expect(mockSessionService.splitChunk).toHaveBeenCalledWith(
        'session_test-123',
        'chunk_1',
        splitDto,
        UserRole.ML,
      );
    });
  });

  describe('updateChunk', () => {
    it('should call service.updateChunk with correct parameters', async () => {
      const updateDto = { text: 'Updated text content' };
      mockSessionService.updateChunk.mockResolvedValue(mockSessionResponse);

      const result = await controller.updateChunk('session_test-123', 'chunk_1', updateDto);

      expect(mockSessionService.updateChunk).toHaveBeenCalledWith(
        'session_test-123',
        'chunk_1',
        updateDto,
      );
      expect(result).toEqual(mockSessionResponse);
    });
  });

  describe('preview', () => {
    it('should call service.preview with correct session id', async () => {
      mockSessionService.preview.mockResolvedValue(mockPreviewResponse);

      const result = await controller.preview('session_test-123');

      expect(mockSessionService.preview).toHaveBeenCalledWith('session_test-123');
      expect(result).toEqual(mockPreviewResponse);
    });
  });

  describe('publish', () => {
    it('should call service.publish with correct parameters', async () => {
      const publishDto = { targetCollectionId: '550e8400-e29b-41d4-a716-446655440000' };
      const user: RequestUser = { id: 'user-1', role: UserRole.DEV };
      mockSessionService.publish.mockResolvedValue(mockPublishResponse);

      const result = await controller.publish('session_test-123', publishDto, user);

      expect(mockSessionService.publish).toHaveBeenCalledWith(
        'session_test-123',
        publishDto,
        'user-1',
      );
      expect(result).toEqual(mockPublishResponse);
    });

    it('should extract user id from RequestUser object', async () => {
      const publishDto = { targetCollectionId: '550e8400-e29b-41d4-a716-446655440000' };
      const user: RequestUser = { id: 'different-user', role: UserRole.ML };
      mockSessionService.publish.mockResolvedValue(mockPublishResponse);

      await controller.publish('session_test-123', publishDto, user);

      expect(mockSessionService.publish).toHaveBeenCalledWith(
        'session_test-123',
        publishDto,
        'different-user',
      );
    });
  });
});
