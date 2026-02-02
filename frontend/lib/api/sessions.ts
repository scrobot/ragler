import { apiClient } from './client';
import {
  MergeChunksRequest,
  PreviewResponse,
  PublishRequest,
  PublishResponse,
  Session,
  SessionListResponse,
  SplitChunkRequest,
  UpdateChunkRequest,
} from '@/types/api';

export const sessionsApi = {
  list: () => apiClient.get<SessionListResponse>('/session'),

  get: (id: string) => apiClient.get<Session>(`/session/${id}`),

  updateChunk: (sessionId: string, chunkId: string, data: UpdateChunkRequest) =>
    apiClient.patch<Session>(`/session/${sessionId}/chunks/${chunkId}`, data),

  mergeChunks: (sessionId: string, data: MergeChunksRequest) =>
    apiClient.post<Session>(`/session/${sessionId}/chunks/merge`, data),

  splitChunk: (sessionId: string, chunkId: string, data: SplitChunkRequest) =>
    apiClient.post<Session>(
      `/session/${sessionId}/chunks/${chunkId}/split`,
      data
    ),

  preview: (sessionId: string) =>
    apiClient.post<PreviewResponse>(`/session/${sessionId}/preview`),

  publish: (sessionId: string, data: PublishRequest) =>
    apiClient.post<PublishResponse>(`/session/${sessionId}/publish`, data),
};
