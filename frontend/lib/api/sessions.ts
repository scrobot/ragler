import { apiClient } from './client';
import {
  DeleteSessionResponse,
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

  addChunk: (sessionId: string, text: string) =>
    apiClient.post<Session>(`/session/${sessionId}/chunks/add`, { text }),

  generateChunk: (sessionId: string, prompt: string) =>
    apiClient.post<Session>(`/session/${sessionId}/chunks/generate`, { prompt }),

  preview: (sessionId: string) =>
    apiClient.post<PreviewResponse>(`/session/${sessionId}/preview`),

  publish: (sessionId: string, data: PublishRequest) =>
    apiClient.post<PublishResponse>(`/session/${sessionId}/publish`, data),

  delete: (sessionId: string) =>
    apiClient.delete<DeleteSessionResponse>(`/session/${sessionId}`),
};
