import axios from 'axios';
import { config } from '../config.js';

interface HealthIndicatorResult {
    status: 'up' | 'down';
    message?: string;
}

interface HealthCheckResponse {
    status: 'ok' | 'error';
    info: Record<string, HealthIndicatorResult>;
    error: Record<string, HealthIndicatorResult>;
    details: Record<string, HealthIndicatorResult>;
}

/**
 * Liveness probe — proves the process is alive.
 * Always returns ok.
 */
export function checkLiveness(): HealthCheckResponse {
    return {
        status: 'ok',
        info: {},
        error: {},
        details: {},
    };
}

/**
 * Readiness probe — checks that the upstream KMS backend API is reachable.
 */
export async function checkReadiness(): Promise<HealthCheckResponse> {
    const indicator = await checkBackendApi();
    const isHealthy = indicator.status === 'up';

    return {
        status: isHealthy ? 'ok' : 'error',
        info: isHealthy ? { 'kms-api': indicator } : {},
        error: isHealthy ? {} : { 'kms-api': indicator },
        details: { 'kms-api': indicator },
    };
}

async function checkBackendApi(): Promise<HealthIndicatorResult> {
    try {
        await axios.get(`${config.kmsApiUrl}/api/health`, {
            timeout: 5000,
        });
        return { status: 'up' };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { status: 'down', message };
    }
}
