import { SourceType } from '@ingest/dto';

export const INGEST_STRATEGIES = 'INGEST_STRATEGIES';

export interface IngestResult {
  content: string;
  title: string;
  sourceUrl: string;
  metadata: Record<string, unknown>;
}

export interface IngestStrategy {
  readonly sourceType: SourceType;
  ingest(url: string): Promise<IngestResult>;
}
