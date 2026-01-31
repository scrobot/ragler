import { Module, Global } from '@nestjs/common';
import { QdrantClientService } from './qdrant.client';

@Global()
@Module({
  providers: [QdrantClientService],
  exports: [QdrantClientService],
})
export class QdrantModule {}
