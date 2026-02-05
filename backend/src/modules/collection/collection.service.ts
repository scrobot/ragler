import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { QdrantClientService, SYS_REGISTRY_COLLECTION } from '@infrastructure/qdrant';
import { CreateCollectionDto, CollectionResponseDto, CollectionListResponseDto } from './dto';

interface CollectionPayload {
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  [key: string]: unknown;
}

@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);

  constructor(private readonly qdrantClient: QdrantClientService) { }

  async ensureRegistryExists(): Promise<void> {
    const exists = await this.qdrantClient.collectionExists(SYS_REGISTRY_COLLECTION);
    if (!exists) {
      await this.qdrantClient.createCollection(SYS_REGISTRY_COLLECTION, 1);
      this.logger.log({
        event: 'registry_created',
        collection: SYS_REGISTRY_COLLECTION,
      });
    }
  }

  async findAll(): Promise<CollectionListResponseDto> {
    await this.ensureRegistryExists();

    const points = await this.qdrantClient.scroll(SYS_REGISTRY_COLLECTION);

    const collections: CollectionResponseDto[] = (points as any[]).map((point) => ({
      id: String(point.id),
      name: point.payload.name,
      description: point.payload.description || '',
      createdBy: point.payload.created_by,
      createdAt: point.payload.created_at,
    }));

    this.logger.log({
      event: 'collections_listed',
      count: collections.length,
    });

    return {
      collections,
      total: collections.length,
    };
  }

  async findOne(id: string): Promise<CollectionResponseDto> {
    await this.ensureRegistryExists();

    const points = await this.qdrantClient.getPoints(SYS_REGISTRY_COLLECTION, [id]);

    if (!points || points.length === 0) {
      this.logger.warn({
        event: 'collection_not_found',
        collectionId: id,
      });
      throw new NotFoundException(`Collection with id ${id} not found`);
    }

    const point = points[0] as any;

    this.logger.log({
      event: 'collection_found',
      collectionId: id,
      name: point.payload.name,
    });

    return {
      id: String(point.id),
      name: point.payload.name,
      description: point.payload.description || '',
      createdBy: point.payload.created_by,
      createdAt: point.payload.created_at,
    };
  }

  async create(dto: CreateCollectionDto, userId: string): Promise<CollectionResponseDto> {
    await this.ensureRegistryExists();

    const id = uuidv4();
    const dataCollectionName = `kb_${id}`;

    const exists = await this.qdrantClient.collectionExists(dataCollectionName);
    if (exists) {
      throw new ConflictException('Collection already exists');
    }

    await this.qdrantClient.createCollection(dataCollectionName);

    const payload: CollectionPayload = {
      name: dto.name,
      description: dto.description || '',
      created_by: userId,
      created_at: new Date().toISOString(),
    };

    await this.qdrantClient.upsertPoints(SYS_REGISTRY_COLLECTION, [
      {
        id,
        vector: [0],
        payload,
      },
    ]);

    this.logger.log({
      event: 'collection_created',
      collectionId: id,
      name: dto.name,
      userId,
    });

    return {
      id,
      name: dto.name,
      description: dto.description || '',
      createdBy: userId,
      createdAt: payload.created_at,
    };
  }

  async remove(id: string): Promise<void> {
    await this.ensureRegistryExists();

    const collection = await this.findOne(id);

    const dataCollectionName = `kb_${id}`;
    const exists = await this.qdrantClient.collectionExists(dataCollectionName);
    if (exists) {
      await this.qdrantClient.deleteCollection(dataCollectionName);
    }

    await this.qdrantClient.deletePointsByFilter(SYS_REGISTRY_COLLECTION, {
      must: [{ key: 'id', match: { value: id } }],
    });

    this.logger.log({
      event: 'collection_deleted',
      collectionId: id,
      name: collection.name,
    });
  }
}
