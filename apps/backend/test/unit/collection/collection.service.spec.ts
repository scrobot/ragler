import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CollectionService } from '@collection/collection.service';
import { QdrantClientService, SYS_REGISTRY_COLLECTION } from '@infrastructure/qdrant';

// Mock uuid to return predictable values
jest.mock('uuid', () => ({
  v4: jest.fn(() => '550e8400-e29b-41d4-a716-446655440000'),
}));

describe('CollectionService', () => {
  let service: CollectionService;
  let mockQdrantClient: jest.Mocked<
    Pick<
      QdrantClientService,
      | 'collectionExists'
      | 'createCollection'
      | 'createPayloadIndex'
      | 'deleteCollection'
      | 'scroll'
      | 'getPoints'
      | 'upsertPoints'
      | 'deletePoints'
      | 'deletePointsByFilter'
    >
  >;

  const validCollectionId = '550e8400-e29b-41d4-a716-446655440000';

  const createMockCollectionPoint = (overrides: Record<string, unknown> = {}) => ({
    id: validCollectionId,
    payload: {
      name: 'Test Collection',
      description: 'A test collection',
      created_by: 'user-1',
      created_at: '2025-01-01T00:00:00.000Z',
      ...overrides,
    },
  });

  beforeEach(async () => {
    mockQdrantClient = {
      collectionExists: jest.fn(),
      createCollection: jest.fn(),
      createPayloadIndex: jest.fn(),
      deleteCollection: jest.fn(),
      scroll: jest.fn(),
      getPoints: jest.fn(),
      upsertPoints: jest.fn(),
      deletePoints: jest.fn(),
      deletePointsByFilter: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionService,
        { provide: QdrantClientService, useValue: mockQdrantClient },
      ],
    }).compile();

    service = module.get<CollectionService>(CollectionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureRegistryExists', () => {
    it('should create sys_registry collection when it does not exist', async () => {
      mockQdrantClient.collectionExists.mockResolvedValue(false);

      await service.ensureRegistryExists();

      expect(mockQdrantClient.collectionExists).toHaveBeenCalledWith(SYS_REGISTRY_COLLECTION);
      expect(mockQdrantClient.createCollection).toHaveBeenCalledWith(SYS_REGISTRY_COLLECTION, 1);
    });

    it('should not create sys_registry collection when it already exists', async () => {
      mockQdrantClient.collectionExists.mockResolvedValue(true);

      await service.ensureRegistryExists();

      expect(mockQdrantClient.collectionExists).toHaveBeenCalledWith(SYS_REGISTRY_COLLECTION);
      expect(mockQdrantClient.createCollection).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all collections from registry', async () => {
      mockQdrantClient.collectionExists.mockResolvedValue(true);
      mockQdrantClient.scroll.mockResolvedValue([
        createMockCollectionPoint(),
        createMockCollectionPoint({
          name: 'Second Collection',
          description: 'Another collection',
        }),
      ]);

      const result = await service.findAll();

      expect(mockQdrantClient.scroll).toHaveBeenCalledWith(SYS_REGISTRY_COLLECTION);
      expect(result.collections).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.collections[0]).toEqual({
        id: validCollectionId,
        name: 'Test Collection',
        description: 'A test collection',
        createdBy: 'user-1',
        createdAt: '2025-01-01T00:00:00.000Z',
      });
    });

    it('should return empty list when no collections exist', async () => {
      mockQdrantClient.collectionExists.mockResolvedValue(true);
      mockQdrantClient.scroll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result.collections).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle collections with missing description', async () => {
      mockQdrantClient.collectionExists.mockResolvedValue(true);
      mockQdrantClient.scroll.mockResolvedValue([
        {
          id: validCollectionId,
          payload: {
            name: 'No Description',
            created_by: 'user-1',
            created_at: '2025-01-01T00:00:00.000Z',
          },
        },
      ]);

      const result = await service.findAll();

      expect(result.collections[0].description).toBe('');
    });
  });

  describe('findOne', () => {
    it('should return collection when it exists', async () => {
      mockQdrantClient.collectionExists.mockResolvedValue(true);
      mockQdrantClient.getPoints.mockResolvedValue([createMockCollectionPoint()]);

      const result = await service.findOne(validCollectionId);

      expect(mockQdrantClient.getPoints).toHaveBeenCalledWith(SYS_REGISTRY_COLLECTION, [
        validCollectionId,
      ]);
      expect(result).toEqual({
        id: validCollectionId,
        name: 'Test Collection',
        description: 'A test collection',
        createdBy: 'user-1',
        createdAt: '2025-01-01T00:00:00.000Z',
      });
    });

    it('should throw NotFoundException when collection does not exist', async () => {
      mockQdrantClient.collectionExists.mockResolvedValue(true);
      mockQdrantClient.getPoints.mockResolvedValue([]);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Collection with id nonexistent not found',
      );
    });

    it('should throw NotFoundException when getPoints returns null', async () => {
      mockQdrantClient.collectionExists.mockResolvedValue(true);
      mockQdrantClient.getPoints.mockResolvedValue(null as any);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should handle collection with missing description', async () => {
      mockQdrantClient.collectionExists.mockResolvedValue(true);
      mockQdrantClient.getPoints.mockResolvedValue([
        {
          id: validCollectionId,
          payload: {
            name: 'No Description',
            created_by: 'user-1',
            created_at: '2025-01-01T00:00:00.000Z',
          },
        },
      ]);

      const result = await service.findOne(validCollectionId);

      expect(result.description).toBe('');
    });
  });

  describe('create', () => {
    it('should create collection successfully', async () => {
      mockQdrantClient.collectionExists
        .mockResolvedValueOnce(true) // ensureRegistryExists check
        .mockResolvedValueOnce(false); // dataCollectionName check

      const result = await service.create({ name: 'New Collection', description: 'A new one' }, 'user-1');

      expect(mockQdrantClient.createCollection).toHaveBeenCalledWith(`kb_${validCollectionId}`);
      expect(mockQdrantClient.upsertPoints).toHaveBeenCalledWith(SYS_REGISTRY_COLLECTION, [
        expect.objectContaining({
          id: validCollectionId,
          vector: [0],
          payload: expect.objectContaining({
            name: 'New Collection',
            description: 'A new one',
            created_by: 'user-1',
          }),
        }),
      ]);
      expect(result).toEqual({
        id: validCollectionId,
        name: 'New Collection',
        description: 'A new one',
        createdBy: 'user-1',
        createdAt: expect.any(String),
      });
    });

    it('should create collection with empty description when not provided', async () => {
      mockQdrantClient.collectionExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await service.create({ name: 'Minimal Collection' }, 'user-1');

      expect(mockQdrantClient.upsertPoints).toHaveBeenCalledWith(SYS_REGISTRY_COLLECTION, [
        expect.objectContaining({
          payload: expect.objectContaining({
            description: '',
          }),
        }),
      ]);
      expect(result.description).toBe('');
    });

    it('should throw ConflictException when data collection already exists', async () => {
      mockQdrantClient.collectionExists
        .mockResolvedValueOnce(true) // ensureRegistryExists check
        .mockResolvedValueOnce(true); // dataCollectionName check - exists!

      const createPromise = service.create({ name: 'Duplicate Collection' }, 'user-1');

      await expect(createPromise).rejects.toThrow(ConflictException);
      await expect(createPromise).rejects.toThrow('Collection already exists');
    });
  });

  describe('remove', () => {
    it('should remove collection and registry entry', async () => {
      mockQdrantClient.collectionExists
        .mockResolvedValueOnce(true) // ensureRegistryExists
        .mockResolvedValueOnce(true) // findOne ensureRegistryExists
        .mockResolvedValueOnce(true); // dataCollectionName exists check
      mockQdrantClient.getPoints.mockResolvedValue([createMockCollectionPoint()]);

      await service.remove(validCollectionId);

      expect(mockQdrantClient.deleteCollection).toHaveBeenCalledWith(`kb_${validCollectionId}`);
      expect(mockQdrantClient.deletePoints).toHaveBeenCalledWith(
        SYS_REGISTRY_COLLECTION,
        [validCollectionId],
      );
    });

    it('should not delete data collection if it does not exist', async () => {
      mockQdrantClient.collectionExists
        .mockResolvedValueOnce(true) // ensureRegistryExists
        .mockResolvedValueOnce(true) // findOne ensureRegistryExists
        .mockResolvedValueOnce(false); // dataCollectionName does not exist
      mockQdrantClient.getPoints.mockResolvedValue([createMockCollectionPoint()]);

      await service.remove(validCollectionId);

      expect(mockQdrantClient.deleteCollection).not.toHaveBeenCalled();
      expect(mockQdrantClient.deletePoints).toHaveBeenCalledWith(
        SYS_REGISTRY_COLLECTION,
        [validCollectionId],
      );
    });

    it('should throw NotFoundException when collection does not exist in registry', async () => {
      mockQdrantClient.collectionExists.mockResolvedValue(true);
      mockQdrantClient.getPoints.mockResolvedValue([]);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.remove('nonexistent')).rejects.toThrow(
        'Collection with id nonexistent not found',
      );
    });
  });
});
