import { Controller, Get, Patch, Delete, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';
import {
    UpdateAgentSettingsDto,
    AVAILABLE_MODELS,
    type AgentSettingsResponse,
    type AvailableModelsResponse,
} from './settings.dto';
import {
    FeatureFlagService,
    type FeatureFlagsResponse,
} from '@config/feature-flag.service';

@Controller('settings')
export class SettingsController {
    constructor(
        private readonly settingsService: SettingsService,
        private readonly featureFlagService: FeatureFlagService,
    ) { }

    @Get('agent')
    async getAgentSettings(): Promise<AgentSettingsResponse> {
        return this.settingsService.getAgentSettings();
    }

    @Patch('agent')
    async updateAgentSettings(
        @Body() dto: UpdateAgentSettingsDto,
    ): Promise<AgentSettingsResponse> {
        return this.settingsService.updateAgentSettings(dto);
    }

    @Get('agent/models')
    getAvailableModels(): AvailableModelsResponse {
        return {
            models: AVAILABLE_MODELS.map((m) => ({
                id: m.id,
                name: m.name,
                description: m.description,
            })),
        };
    }

    @Get('features')
    getFeatureFlags(): FeatureFlagsResponse {
        return this.featureFlagService.getAll();
    }

    @Patch('features')
    updateFeatureFlags(
        @Body() body: Partial<FeatureFlagsResponse>,
    ): FeatureFlagsResponse {
        return this.featureFlagService.update(body);
    }

    @Delete('features')
    resetFeatureFlags(): FeatureFlagsResponse {
        return this.featureFlagService.resetToDefaults();
    }
}
