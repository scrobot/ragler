import { apiClient } from './client';
import type {
    AgentSettingsResponse,
    UpdateAgentSettingsRequest,
    AvailableModelsResponse,
} from '@/types/api';

export const settingsApi = {
    getAgentSettings: (): Promise<AgentSettingsResponse> =>
        apiClient.get('/settings/agent'),

    updateAgentSettings: (data: UpdateAgentSettingsRequest): Promise<AgentSettingsResponse> =>
        apiClient.patch('/settings/agent', data),

    getAvailableModels: (): Promise<AvailableModelsResponse> =>
        apiClient.get('/settings/agent/models'),
};
