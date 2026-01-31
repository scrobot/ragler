import { Module } from '@nestjs/common';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { ConfluenceStrategy } from './strategies/confluence.strategy';
import { WebStrategy } from './strategies/web.strategy';

@Module({
  controllers: [IngestController],
  providers: [IngestService, ConfluenceStrategy, WebStrategy],
  exports: [IngestService],
})
export class IngestModule {}
