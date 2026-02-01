import { apiClient } from './client';
import { IngestRequest, IngestResponse } from '@/types/api';

export const ingestApi = {
  create: (data: IngestRequest) =>
    apiClient.post<IngestResponse>('/ingest', data),
};
