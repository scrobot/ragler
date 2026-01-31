import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

export const SYS_REGISTRY_COLLECTION = 'sys_registry';

@Injectable()
export class QdrantClientService implements OnModuleInit {
  private readonly logger = new Logger(QdrantClientService.name);
  private client: QdrantClient;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('qdrant.url', 'http://localhost:6333');
    this.client = new QdrantClient({ url });
  }

  async onModuleInit(): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      this.logger.log(`Connected to Qdrant. Found ${collections.collections.length} collections.`);
    } catch (error) {
      this.logger.warn('Could not connect to Qdrant. Ensure Qdrant is running.');
    }
  }

  getClient(): QdrantClient {
    return this.client;
  }

  async collectionExists(collectionName: string): Promise<boolean> {
    try {
      await this.client.getCollection(collectionName);
      return true;
    } catch {
      return false;
    }
  }

  async createCollection(collectionName: string, vectorSize: number = 1536): Promise<void> {
    await this.client.createCollection(collectionName, {
      vectors: {
        size: vectorSize,
        distance: 'Cosine',
      },
    });
    this.logger.log(`Created collection: ${collectionName}`);
  }

  async deleteCollection(collectionName: string): Promise<void> {
    await this.client.deleteCollection(collectionName);
    this.logger.log(`Deleted collection: ${collectionName}`);
  }

  async upsertPoints(
    collectionName: string,
    points: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }>,
  ): Promise<void> {
    await this.client.upsert(collectionName, {
      wait: true,
      points,
    });
  }

  async deletePointsByFilter(
    collectionName: string,
    filter: Record<string, unknown>,
  ): Promise<void> {
    await this.client.delete(collectionName, {
      wait: true,
      filter: filter as any,
    });
  }

  async search(
    collectionName: string,
    vector: number[],
    limit: number = 10,
    filter?: Record<string, unknown>,
  ): Promise<unknown[]> {
    const result = await this.client.search(collectionName, {
      vector,
      limit,
      filter: filter as any,
      with_payload: true,
    });
    return result;
  }

  async getPoints(
    collectionName: string,
    ids: string[],
  ): Promise<unknown[]> {
    const result = await this.client.retrieve(collectionName, {
      ids,
      with_payload: true,
      with_vector: false,
    });
    return result;
  }

  async scroll(
    collectionName: string,
    filter?: Record<string, unknown>,
    limit: number = 100,
  ): Promise<unknown[]> {
    const result = await this.client.scroll(collectionName, {
      filter: filter as any,
      limit,
      with_payload: true,
      with_vector: false,
    });
    return result.points;
  }
}
