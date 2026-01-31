import { Module } from '@nestjs/common';
import { ConfigModule } from './config';
import { RedisModule, QdrantModule } from './infrastructure';
import {
  CollectionModule,
  IngestModule,
  SessionModule,
  LlmModule,
  VectorModule,
} from './modules';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    QdrantModule,
    LlmModule,
    CollectionModule,
    IngestModule,
    SessionModule,
    VectorModule,
  ],
})
export class AppModule {}
