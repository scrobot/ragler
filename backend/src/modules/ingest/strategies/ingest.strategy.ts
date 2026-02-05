import { SourceType } from '@ingest/dto';

export const INGEST_STRATEGIES = 'INGEST_STRATEGIES';

export interface IngestResult {
  content: string;
  title: string;
  sourceUrl: string;
  metadata: Record<string, unknown>;
  /**
   * Raw HTML/XML content for source preview.
   * Present for web (HTML) and confluence (storage format XML) sources.
   * Undefined for manual text sources.
   * WARNING: Must be sanitized (e.g., DOMPurify) before rendering in browser.
   */
  rawContent?: string;
}

export interface IngestStrategy {
  readonly sourceType: SourceType;
  ingest(url: string): Promise<IngestResult>;
}
