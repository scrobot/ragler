import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { QdrantClientService } from '@infrastructure/qdrant/qdrant.client';

@Injectable()
export class QdrantHealthIndicator extends HealthIndicator {
  constructor(private readonly qdrantClient: QdrantClientService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const client = this.qdrantClient.getClient();
      await client.getCollections();

      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Qdrant health check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}
