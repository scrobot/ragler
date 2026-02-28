import { apiClient } from './client';
import type {
    AgentSettingsResponse,
    UpdateAgentSettingsRequest,
    AvailableModelsResponse,
    FeatureFlagsResponse,
} from '@/types/api';

export const settingsApi = {
    getAgentSettings: (): Promise<AgentSettingsResponse> =>
        apiClient.get('/settings/agent'),

    updateAgentSettings: (data: UpdateAgentSettingsRequest): Promise<AgentSettingsResponse> =>
        apiClient.patch('/settings/agent', data),

    getAvailableModels: (): Promise<AvailableModelsResponse> =>
        apiClient.get('/settings/agent/models'),

    getFeatureFlags: (): Promise<FeatureFlagsResponse> =>
        apiClient.get('/settings/features'),

    updateFeatureFlags: (data: Partial<FeatureFlagsResponse>): Promise<FeatureFlagsResponse> =>
        apiClient.patch('/settings/features', data),

    resetFeatureFlags: (): Promise<FeatureFlagsResponse> =>
        apiClient.delete('/settings/features'),
};
