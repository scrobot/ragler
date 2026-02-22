import { apiClient } from './client';
import { IngestRequest, IngestResponse } from '@/types/api';

export const ingestApi = {
  ingestConfluence: (data: { url?: string; pageId?: string }) =>
    apiClient.post<IngestResponse>('/ingest/confluence', data),

  ingestWeb: (data: { url: string }) =>
    apiClient.post<IngestResponse>('/ingest/web', data),

  ingestManual: (data: { content: string }) =>
    apiClient.post<IngestResponse>('/ingest/manual', data),

  ingestFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<IngestResponse>('/ingest/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
