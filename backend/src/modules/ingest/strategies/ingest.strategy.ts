export interface IngestResult {
  content: string;
  title: string;
  sourceUrl: string;
  metadata: Record<string, unknown>;
}

export interface IngestStrategy {
  ingest(url: string): Promise<IngestResult>;
}
