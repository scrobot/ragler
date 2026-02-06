import axios, { AxiosInstance } from 'axios';
import { config } from '../config.js';

export interface SearchRequest {
  query: string;
  collectionId: string;
  limit?: number;
}

export interface SearchResult {
  id: string;
  score: number;
  content: string;
  sourceUrl: string;
  sourceType: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface CollectionsResponse {
  collections: Collection[];
  total: number;
}

export class KMSClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${config.kmsApiUrl}/api`,
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': config.userId,
        'X-User-Role': config.userRole,
      },
      timeout: 30000, // 30 second timeout
    });
  }

  async searchKnowledge(request: SearchRequest): Promise<SearchResponse> {
    const response = await this.client.post<SearchResponse>('/search', request);
    return response.data;
  }

  async listCollections(): Promise<CollectionsResponse> {
    const response = await this.client.get<CollectionsResponse>('/collections');
    return response.data;
  }

  async getCollection(id: string): Promise<Collection> {
    const response = await this.client.get<Collection>(`/collections/${id}`);
    return response.data;
  }
}

export const kmsClient = new KMSClient();
