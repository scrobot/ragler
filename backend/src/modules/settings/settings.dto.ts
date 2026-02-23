import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Available OpenAI models for the agent — grouped by family
// IDs must match exact OpenAI API model identifiers
export const AVAILABLE_MODELS = [
    // GPT-5 family (flagship, Aug 2025)
    { id: 'gpt-5', name: 'GPT-5', description: 'Best for complex coding & agentic tasks' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Fast & cost-efficient' },
    { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Fastest in GPT-5 family' },

    // Reasoning models (o-series)
    { id: 'o3', name: 'o3', description: 'Powerful reasoning — math, science, code' },
    { id: 'o3-mini', name: 'o3 Mini', description: 'Small reasoning model' },
    { id: 'o4-mini', name: 'o4 Mini', description: 'Fast reasoning — visual & coding' },

    // GPT-4.1 family
    { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Strong non-reasoning model' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Balanced performance & cost' },
    { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', description: 'Most affordable in 4.1 family' },

    // GPT-4o (legacy)
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Multimodal (legacy)' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Affordable multimodal (legacy)' },
] as const;

export type AvailableModelId = (typeof AVAILABLE_MODELS)[number]['id'];

export const AVAILABLE_MODEL_IDS: string[] = AVAILABLE_MODELS.map((m) => m.id);

// Stored settings shape (persisted in Redis)
export const AgentSettingsSchema = z.object({
    modelName: z.string().min(1),
    apiKey: z.string().nullable(),
});

export type AgentSettings = z.infer<typeof AgentSettingsSchema>;

// Update request (from client)
export const UpdateAgentSettingsSchema = z.object({
    modelName: z.string().min(1).optional(),
    apiKey: z.string().min(1).nullable().optional(),
});

export class UpdateAgentSettingsDto extends createZodDto(UpdateAgentSettingsSchema) { }

// Response shape (never exposes full key)
export interface AgentSettingsResponse {
    modelName: string;
    hasCustomApiKey: boolean;
    maskedApiKey: string | null;
}

export interface AvailableModelsResponse {
    models: Array<{
        id: string;
        name: string;
        description: string;
    }>;
}

/**
 * Mask an API key for safe display: show first 4 and last 4 characters.
 */
export function maskApiKey(key: string): string {
    if (key.length <= 8) {
        return '****';
    }
    return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`;
}
