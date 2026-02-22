import { Module } from '@nestjs/common';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { ConfluenceStrategy } from './strategies/confluence.strategy';
import { WebStrategy } from './strategies/web.strategy';
import { ManualStrategy } from './strategies/manual.strategy';
import { FileStrategy } from './strategies/file.strategy';
import { IngestStrategyResolver } from './strategies/ingest-strategy.resolver';
import { INGEST_STRATEGIES } from './strategies/ingest.strategy';
import { LlmModule } from '@llm/llm.module';

@Module({
  imports: [LlmModule],
  controllers: [IngestController],
  providers: [
    IngestService,
    ConfluenceStrategy,
    WebStrategy,
    ManualStrategy,
    FileStrategy,
    {
      provide: INGEST_STRATEGIES,
      useFactory: (
        confluence: ConfluenceStrategy,
        web: WebStrategy,
        manual: ManualStrategy,
        file: FileStrategy,
      ) => [confluence, web, manual, file],
      inject: [ConfluenceStrategy, WebStrategy, ManualStrategy, FileStrategy],
    },
    IngestStrategyResolver,
  ],
  exports: [IngestService],
})
export class IngestModule { }
