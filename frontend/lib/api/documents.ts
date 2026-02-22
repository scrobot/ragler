import { apiClient } from './client';

export interface DocumentSummary {
    sourceId: string;
    title: string | null;
    sourceType: 'confluence' | 'web' | 'manual' | 'file';
    sourceUrl: string;
    filename: string | null;
    mimeType: string | null;
    chunkCount: number;
    avgQualityScore: number | null;
    ingestDate: string | null;
    lastModifiedAt: string;
}

export interface DocumentListResponse {
    documents: DocumentSummary[];
    total: number;
}

export const documentsApi = {
    list: async (collectionId: string): Promise<DocumentListResponse> => {
        return apiClient.get<DocumentListResponse>(
            `/collections/${collectionId}/documents`,
        );
    },
};
