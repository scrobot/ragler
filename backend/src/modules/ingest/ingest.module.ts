import { Module } from '@nestjs/common';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { ConfluenceStrategy } from './strategies/confluence.strategy';
import { WebStrategy } from './strategies/web.strategy';
import { ManualStrategy } from './strategies/manual.strategy';
import { IngestStrategyResolver } from './strategies/ingest-strategy.resolver';
import { INGEST_STRATEGIES } from './strategies/ingest.strategy';

@Module({
  controllers: [IngestController],
  providers: [
    IngestService,
    ConfluenceStrategy,
    WebStrategy,
    ManualStrategy,
    {
      provide: INGEST_STRATEGIES,
      useFactory: (
        confluence: ConfluenceStrategy,
        web: WebStrategy,
        manual: ManualStrategy,
      ) => [confluence, web, manual],
      inject: [ConfluenceStrategy, WebStrategy, ManualStrategy],
    },
    IngestStrategyResolver,
  ],
  exports: [IngestService],
})
export class IngestModule { }
