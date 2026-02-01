import { apiClient } from './client';
import {
  Collection,
  CollectionListResponse,
  CreateCollectionRequest,
} from '@/types/api';

export const collectionsApi = {
  list: () => apiClient.get<CollectionListResponse>('/collections'),

  get: (id: string) => apiClient.get<Collection>(`/collections/${id}`),

  create: (data: CreateCollectionRequest) =>
    apiClient.post<Collection>('/collections', data),

  delete: (id: string) => apiClient.delete<void>(`/collections/${id}`),
};
