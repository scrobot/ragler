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
    } catch {
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

  async createPayloadIndex(
    collectionName: string,
    fieldName: string,
    fieldSchema: 'keyword' | 'integer' | 'float' | 'geo' | 'text',
  ): Promise<void> {
    await this.client.createPayloadIndex(collectionName, {
      field_name: fieldName,
      field_schema: fieldSchema,
    });
    this.logger.log(`Created payload index on ${collectionName}.${fieldName}`);
  }

  async deleteCollection(collectionName: string): Promise<void> {
    await this.client.deleteCollection(collectionName);
    this.logger.log(`Deleted collection: ${collectionName}`);
  }

  async upsertPoints(
    collectionName: string,
    points: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }>,
  ): Promise<void> {
    try {
      await this.client.upsert(collectionName, {
        wait: true,
        points,
      });
    } catch (error: any) {
      // Log more details about the error
      console.error('Qdrant upsert error:', {
        message: error.message,
        status: error.status,
        data: error.data,
        body: error.body,
        response: error.response?.data,
      });
      throw error;
    }
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

  async deletePoints(
    collectionName: string,
    ids: string[],
  ): Promise<void> {
    await this.client.delete(collectionName, {
      wait: true,
      points: ids,
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

  /**
   * Scroll with pagination and ordering support for Collection Editor
   * Uses offset-based pagination with optional ordering by payload field
   */
  async scrollWithOrder(
    collectionName: string,
    options: {
      filter?: Record<string, unknown>;
      limit?: number;
      offset?: number;
      orderBy?: {
        field: string;
        direction?: 'asc' | 'desc';
      };
    } = {},
  ): Promise<{ points: unknown[]; nextOffset: number | null }> {
    const { filter, limit = 20, offset = 0, orderBy } = options;

    // Qdrant scroll supports order_by since v1.7
    const scrollParams: Record<string, unknown> = {
      filter: filter as any,
      limit,
      with_payload: true,
      with_vector: false,
    };

    if (orderBy) {
      scrollParams.order_by = {
        key: orderBy.field,
        direction: orderBy.direction || 'asc',
      };
    }

    // For offset-based pagination, we need to skip `offset` points
    // Qdrant scroll uses cursor-based pagination, so we simulate offset
    // by scrolling multiple times or using offset parameter if supported
    if (offset > 0) {
      scrollParams.offset = offset;
    }

    const result = await this.client.scroll(collectionName, scrollParams as any);

    const hasMore = result.points.length === limit;
    const nextOffset = hasMore ? offset + limit : null;

    return {
      points: result.points,
      nextOffset,
    };
  }

  /**
   * Count points in collection with optional filter
   */
  async countPoints(
    collectionName: string,
    filter?: Record<string, unknown>,
  ): Promise<number> {
    const result = await this.client.count(collectionName, {
      filter: filter as any,
      exact: true,
    });
    return result.count;
  }

  /**
   * Batch update payloads for multiple points
   * Used for updating editor metadata (position, quality_score, etc.)
   */
  async updatePayloads(
    collectionName: string,
    updates: Array<{ id: string; payload: Record<string, unknown> }>,
  ): Promise<void> {
    // Qdrant set_payload can update multiple points at once
    // But we need to call it per-point for different payloads
    for (const update of updates) {
      await this.client.setPayload(collectionName, {
        wait: true,
        points: [update.id],
        payload: update.payload,
      });
    }

    this.logger.debug(`Updated payloads for ${updates.length} points in ${collectionName}`);
  }

  /**
   * Overwrite specific payload fields for points matching a filter
   * Useful for bulk operations like resetting quality scores
   */
  async setPayloadByFilter(
    collectionName: string,
    filter: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.client.setPayload(collectionName, {
      wait: true,
      filter: filter as any,
      payload,
    });
  }
}
