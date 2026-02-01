import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { IngestStrategy, IngestResult } from './ingest.strategy';

import { SourceType } from '@ingest/dto';

@Injectable()
export class WebStrategy implements IngestStrategy {
  readonly sourceType: SourceType = 'web';
  private readonly logger = new Logger(WebStrategy.name);

  async ingest(url: string): Promise<IngestResult> {
    this.logger.log(`Ingesting from web URL: ${url}`);

    // TODO: Implement web scraping
    throw new NotImplementedException('Web ingestion not yet implemented');
  }
}
