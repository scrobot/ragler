'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/settings';
import type { FeatureFlagsResponse } from '@/types/api';

const FEATURE_FLAGS_KEY = ['featureFlags'] as const;

export function useFeatureFlags() {
    return useQuery({
        queryKey: FEATURE_FLAGS_KEY,
        queryFn: () => settingsApi.getFeatureFlags(),
        staleTime: 30 * 1000, // 30s — flags rarely change at runtime
    });
}

export function useUpdateFeatureFlags() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<FeatureFlagsResponse>) =>
            settingsApi.updateFeatureFlags(data),
        onSuccess: (data: FeatureFlagsResponse) => {
            queryClient.setQueryData(FEATURE_FLAGS_KEY, data);
        },
    });
}

export function useResetFeatureFlags() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => settingsApi.resetFeatureFlags(),
        onSuccess: (data: FeatureFlagsResponse) => {
            queryClient.setQueryData(FEATURE_FLAGS_KEY, data);
        },
    });
}
