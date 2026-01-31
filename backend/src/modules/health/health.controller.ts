import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './indicators/redis.health';
import { QdrantHealthIndicator } from './indicators/qdrant.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private redisHealth: RedisHealthIndicator,
    private qdrantHealth: QdrantHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Full health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.redisHealth.isHealthy('redis'),
      () => this.qdrantHealth.isHealthy('qdrant'),
    ]);
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe - is the process running?' })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  @Get('readiness')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe - can the service handle requests?' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.redisHealth.isHealthy('redis'),
      () => this.qdrantHealth.isHealthy('qdrant'),
    ]);
  }
}
