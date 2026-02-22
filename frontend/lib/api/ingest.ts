import { apiClient } from './client';
import { IngestRequest, IngestResponse } from '@/types/api';

interface ChunkingConfig {
  method: 'llm' | 'character';
  chunkSize: number;
  overlap: number;
}

export const ingestApi = {
  ingestConfluence: (data: { url?: string; pageId?: string; chunkingConfig?: ChunkingConfig }) =>
    apiClient.post<IngestResponse>('/ingest/confluence', data),

  ingestWeb: (data: { url: string; chunkingConfig?: ChunkingConfig }) =>
    apiClient.post<IngestResponse>('/ingest/web', data),

  ingestManual: (data: { content: string; chunkingConfig?: ChunkingConfig }) =>
    apiClient.post<IngestResponse>('/ingest/manual', data),

  ingestFile: (file: File, chunkingConfig?: ChunkingConfig) => {
    const formData = new FormData();
    formData.append('file', file);
    if (chunkingConfig) {
      formData.append('chunkingConfig', JSON.stringify(chunkingConfig));
    }
    return apiClient.post<IngestResponse>('/ingest/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

