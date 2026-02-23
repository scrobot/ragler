import { Controller, Get, Patch, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';
import {
    UpdateAgentSettingsDto,
    AVAILABLE_MODELS,
    type AgentSettingsResponse,
    type AvailableModelsResponse,
} from './settings.dto';

@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

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
}
