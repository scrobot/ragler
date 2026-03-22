import { apiClient } from './client';
import {
  Collection,
  CollectionListResponse,
  CreateCollectionRequest,
  EditorChunk,
  EditorChunkListResponse,
  ListChunksQuery,
  CreateEditorChunkRequest,
  UpdateEditorChunkRequest,
  SplitEditorChunkRequest,
  MergeEditorChunksRequest,
  ReorderChunksRequest,
  UpdateQualityScoreRequest,
  AgentEvent,
  AgentChatRequest,
  ApproveOperationRequest,
} from '@/types/api';

export const collectionsApi = {
  // Collection CRUD
  list: () => apiClient.get<CollectionListResponse>('/collections'),

  get: (id: string) => apiClient.get<Collection>(`/collections/${id}`),

  create: (data: CreateCollectionRequest) =>
    apiClient.post<Collection>('/collections', data),

  delete: (id: string) => apiClient.delete<void>(`/collections/${id}`),

  // Chunk operations
  listChunks: (id: string, params?: ListChunksQuery) =>
    apiClient.get<EditorChunkListResponse>(`/collections/${id}/chunks`, { params }),

  getChunk: (id: string, chunkId: string) =>
    apiClient.get<EditorChunk>(`/collections/${id}/chunks/${chunkId}`),

  createChunk: (id: string, data: CreateEditorChunkRequest) =>
    apiClient.post<EditorChunk>(`/collections/${id}/chunks`, data),

  updateChunk: (id: string, chunkId: string, data: UpdateEditorChunkRequest) =>
    apiClient.put<EditorChunk>(`/collections/${id}/chunks/${chunkId}`, data),

  deleteChunk: (id: string, chunkId: string) =>
    apiClient.delete<void>(`/collections/${id}/chunks/${chunkId}`),

  splitChunk: (id: string, chunkId: string, data: SplitEditorChunkRequest) =>
    apiClient.post<EditorChunkListResponse>(`/collections/${id}/chunks/${chunkId}/split`, data),

  mergeChunks: (id: string, data: MergeEditorChunksRequest) =>
    apiClient.post<EditorChunk>(`/collections/${id}/chunks/merge`, data),

  reorder: (id: string, data: ReorderChunksRequest) =>
    apiClient.put<void>(`/collections/${id}/reorder`, data),

  updateQuality: (id: string, chunkId: string, data: UpdateQualityScoreRequest) =>
    apiClient.put<EditorChunk>(`/collections/${id}/chunks/${chunkId}/quality`, data),

  // Agent operations (non-streaming)
  approveOperation: (id: string, operationId: string, data: ApproveOperationRequest) =>
    apiClient.post<{ approved: boolean; operationId: string }>(
      `/collections/${id}/agent/approve/${operationId}`,
      data
    ),

  revokeOperation: (id: string, operationId: string, data: ApproveOperationRequest) =>
    apiClient.post<{ revoked: boolean; operationId: string }>(
      `/collections/${id}/agent/revoke/${operationId}`,
      data
    ),

  clearSession: (id: string, sessionId: string) =>
    apiClient.delete<void>(`/collections/${id}/agent/session/${sessionId}`),

  // Session management
  createSession: (collectionId: string, title?: string) =>
    apiClient.post<{ id: string; title: string; collectionId: string; createdAt: string }>(
      `/collections/${collectionId}/agent/sessions`,
      { title },
    ),

  listSessions: (collectionId: string) =>
    apiClient.get<{ sessions: Array<{ id: string; title: string; collectionId: string; createdAt: string; updatedAt: string }> }>(
      `/collections/${collectionId}/agent/sessions`,
    ),

  getSessionWithHistory: (collectionId: string, sessionId: string) =>
    apiClient.get<{
      session: { id: string; title: string; collectionId: string; createdAt: string; updatedAt: string } | null;
      messages: Array<{ role: string; content: string }>;
    }>(`/collections/${collectionId}/agent/sessions/${sessionId}`),

  renameSession: (collectionId: string, sessionId: string, title: string) =>
    apiClient.patch<{ success: boolean }>(
      `/collections/${collectionId}/agent/sessions/${sessionId}`,
      { title },
    ),

  deleteAgentSession: (collectionId: string, sessionId: string) =>
    apiClient.delete<void>(`/collections/${collectionId}/agent/sessions/${sessionId}`),

  // Prompt management
  getGlobalPrompt: (collectionId: string) =>
    apiClient.get<{ prompt: string; isDefault: boolean }>(
      `/collections/${collectionId}/agent/prompts/global`,
    ),

  getDefaultPrompt: (collectionId: string) =>
    apiClient.get<{ prompt: string }>(
      `/collections/${collectionId}/agent/prompts/default`,
    ),

  updateGlobalPrompt: (collectionId: string, prompt: string) =>
    apiClient.patch<{ success: boolean }>(
      `/collections/${collectionId}/agent/prompts/global`,
      { prompt },
    ),

  resetGlobalPrompt: (collectionId: string) =>
    apiClient.delete<{ success: boolean }>(
      `/collections/${collectionId}/agent/prompts/global`,
    ),

  getCollectionPrompt: (collectionId: string) =>
    apiClient.get<{ prompt: string | null; hasOverride: boolean }>(
      `/collections/${collectionId}/agent/prompt`,
    ),

  updateCollectionPrompt: (collectionId: string, prompt: string) =>
    apiClient.patch<{ success: boolean }>(
      `/collections/${collectionId}/agent/prompt`,
      { prompt },
    ),

  deleteCollectionPrompt: (collectionId: string) =>
    apiClient.delete<{ success: boolean }>(
      `/collections/${collectionId}/agent/prompt`,
    ),
};

/**
 * Stream agent chat responses via SSE
 */
export function streamAgentChat(
  collectionId: string,
  data: AgentChatRequest,
  userId: string,
  onEvent: (event: AgentEvent) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): () => void {
  const controller = new AbortController();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

  fetch(`${baseUrl}/collections/${collectionId}/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': userId,
    },
    body: JSON.stringify(data),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              onEvent(eventData);
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      onComplete();
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError(error);
      }
    });

  return () => controller.abort();
}

/**
 * Stream collection cleaning progress via SSE
 */
export function streamCleanCollection(
  collectionId: string,
  onEvent: (event: AgentEvent) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): () => void {
  const controller = new AbortController();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

  fetch(`${baseUrl}/collections/${collectionId}/agent/clean`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              onEvent(eventData);
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      onComplete();
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError(error);
      }
    });

  return () => controller.abort();
}
