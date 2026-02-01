import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { IngestStrategy, IngestResult } from './ingest.strategy';

import { SourceType } from '@ingest/dto';

@Injectable()
export class ConfluenceStrategy implements IngestStrategy {
  readonly sourceType: SourceType = 'confluence';
  private readonly logger = new Logger(ConfluenceStrategy.name);

  async ingest(url: string): Promise<IngestResult> {
    this.logger.log(`Ingesting from Confluence: ${url}`);

    // TODO: Implement Confluence API integration
    throw new NotImplementedException('Confluence ingestion not yet implemented');
  }
}
