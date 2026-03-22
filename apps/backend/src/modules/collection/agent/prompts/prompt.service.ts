import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@infrastructure/redis';
import { DEFAULT_SYSTEM_PROMPT } from './system-prompt';

const GLOBAL_PROMPT_KEY = 'agent:prompt:global';
const COLLECTION_PROMPT_KEY_PREFIX = 'agent:prompt:collection:';

@Injectable()
export class PromptService {
    private readonly logger = new Logger(PromptService.name);

    constructor(private readonly redis: RedisService) { }

    async getGlobalPrompt(): Promise<string> {
        const stored = await this.redis.get(GLOBAL_PROMPT_KEY);
        return stored ?? DEFAULT_SYSTEM_PROMPT;
    }

    async setGlobalPrompt(prompt: string): Promise<void> {
        await this.redis.set(GLOBAL_PROMPT_KEY, prompt);
        this.logger.log({ event: 'global_prompt_updated', length: prompt.length });
    }

    async resetGlobalPrompt(): Promise<void> {
        await this.redis.del(GLOBAL_PROMPT_KEY);
        this.logger.log({ event: 'global_prompt_reset_to_default' });
    }

    async getCollectionPrompt(collectionId: string): Promise<string | null> {
        return this.redis.get(`${COLLECTION_PROMPT_KEY_PREFIX}${collectionId}`);
    }

    async setCollectionPrompt(collectionId: string, prompt: string): Promise<void> {
        await this.redis.set(`${COLLECTION_PROMPT_KEY_PREFIX}${collectionId}`, prompt);
        this.logger.log({ event: 'collection_prompt_updated', collectionId, length: prompt.length });
    }

    async deleteCollectionPrompt(collectionId: string): Promise<void> {
        await this.redis.del(`${COLLECTION_PROMPT_KEY_PREFIX}${collectionId}`);
        this.logger.log({ event: 'collection_prompt_deleted', collectionId });
    }

    /**
     * Returns the effective prompt for a collection:
     * collection-specific override if set, otherwise global prompt.
     */
    async getEffectivePrompt(collectionId: string): Promise<string> {
        const collectionPrompt = await this.getCollectionPrompt(collectionId);
        if (collectionPrompt) {
            return collectionPrompt;
        }
        return this.getGlobalPrompt();
    }

    /**
     * Returns the hardcoded default prompt (for "Reset to Default" UI).
     */
    getDefaultPrompt(): string {
        return DEFAULT_SYSTEM_PROMPT;
    }
}
