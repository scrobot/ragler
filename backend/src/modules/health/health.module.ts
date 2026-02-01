import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { QdrantModule } from '@infrastructure/qdrant/qdrant.module';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health';
import { QdrantHealthIndicator } from './indicators/qdrant.health';

@Module({
  imports: [TerminusModule, RedisModule, QdrantModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator, QdrantHealthIndicator],
})
export class HealthModule { }
