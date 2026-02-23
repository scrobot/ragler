import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@infrastructure/redis/redis.service';
import {
    AgentSettings,
    AgentSettingsSchema,
    AgentSettingsResponse,
    UpdateAgentSettingsDto,
    maskApiKey,
} from './settings.dto';

const SETTINGS_KEY = 'settings:agent';
const DEFAULT_MODEL = 'gpt-5';

@Injectable()
export class SettingsService {
    private readonly logger = new Logger(SettingsService.name);

    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Read raw settings from Redis, falling back to env defaults.
     */
    private async getRawSettings(): Promise<AgentSettings> {
        const stored = await this.redisService.getJson<unknown>(SETTINGS_KEY);

        if (stored) {
            const parsed = AgentSettingsSchema.safeParse(stored);
            if (parsed.success) {
                return parsed.data;
            }
            this.logger.warn({ event: 'settings_parse_error', errors: parsed.error.message });
        }

        // Fallback to env defaults
        return {
            modelName: DEFAULT_MODEL,
            apiKey: null,
        };
    }

    /**
     * Get settings with the API key masked for safe display.
     */
    async getAgentSettings(): Promise<AgentSettingsResponse> {
        const settings = await this.getRawSettings();
        const effectiveKey = settings.apiKey || this.configService.get<string>('openai.apiKey') || '';

        return {
            modelName: settings.modelName,
            hasCustomApiKey: settings.apiKey !== null,
            maskedApiKey: effectiveKey ? maskApiKey(effectiveKey) : null,
        };
    }

    /**
     * Update agent settings in Redis.
     */
    async updateAgentSettings(dto: UpdateAgentSettingsDto): Promise<AgentSettingsResponse> {
        const current = await this.getRawSettings();

        if (dto.modelName !== undefined) {
            current.modelName = dto.modelName;
        }

        if (dto.apiKey !== undefined) {
            current.apiKey = dto.apiKey;
        }

        await this.redisService.setJson(SETTINGS_KEY, current);

        this.logger.log({
            event: 'agent_settings_updated',
            modelName: current.modelName,
            hasCustomApiKey: current.apiKey !== null,
        });

        return this.getAgentSettings();
    }

    /**
     * Get the effective API key (Redis override or env fallback).
     * Used by other services at call time.
     */
    async getEffectiveApiKey(): Promise<string> {
        const settings = await this.getRawSettings();
        return settings.apiKey || this.configService.get<string>('openai.apiKey') || '';
    }

    /**
     * Get the effective model name (Redis override or default).
     * Used by other services at call time.
     */
    async getEffectiveModel(): Promise<string> {
        const settings = await this.getRawSettings();
        return settings.modelName;
    }
}
