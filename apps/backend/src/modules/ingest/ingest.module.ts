import { Module } from '@nestjs/common';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
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
    WebStrategy,
    ManualStrategy,
    FileStrategy,
    {
      provide: INGEST_STRATEGIES,
      useFactory: (
        web: WebStrategy,
        manual: ManualStrategy,
        file: FileStrategy,
      ) => [web, manual, file],
      inject: [WebStrategy, ManualStrategy, FileStrategy],
    },
    IngestStrategyResolver,
  ],
  exports: [IngestService],
})
export class IngestModule { }
