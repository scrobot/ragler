import { apiClient } from './client';

export interface ChatCitation {
    chunkId: string;
    content: string;
    score: number;
}

export interface ChatResponse {
    answer: string;
    sessionId: string;
    citations: ChatCitation[];
}

export const chatApi = {
    send: async (
        collectionId: string,
        message: string,
        sessionId?: string,
    ): Promise<ChatResponse> => {
        return apiClient.post<ChatResponse>(
            `/collections/${collectionId}/chat`,
            { message, sessionId },
        );
    },
};
