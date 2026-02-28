import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConfigModule as AppConfigModule, FeatureFlagGuard } from './config';
import { RedisModule, QdrantModule, SqliteModule } from './infrastructure';
import {
  CollectionModule,
  IngestModule,
  SessionModule,
  LlmModule,
  VectorModule,
  HealthModule,
  SettingsModule,
} from './modules';

@Module({
  imports: [
    AppConfigModule,
    SettingsModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('throttle.ttl', 60000),
            limit: config.get<number>('throttle.limit', 100),
          },
        ],
      }),
    }),
    RedisModule,
    QdrantModule,
    SqliteModule,
    LlmModule,
    CollectionModule,
    IngestModule,
    SessionModule,
    VectorModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: FeatureFlagGuard,
    },
  ],
})
export class AppModule { }
