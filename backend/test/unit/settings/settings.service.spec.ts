import { ConfigService } from '@nestjs/config';
import { SettingsService } from '@modules/settings/settings.service';
import { RedisService } from '@infrastructure/redis/redis.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let redisService: jest.Mocked<RedisService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    redisService = {
      getJson: jest.fn(),
      setJson: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    service = new SettingsService(redisService, configService);
  });

  describe('getAgentSettings', () => {
    it('should return defaults when Redis has no settings', async () => {
      redisService.getJson.mockResolvedValue(null);
      configService.get.mockReturnValue('sk-env-key-1234567890');

      const result = await service.getAgentSettings();

      expect(result.modelName).toBe('gpt-5');
      expect(result.hasCustomApiKey).toBe(false);
      expect(result.maskedApiKey).toContain('****');
      expect(result.maskedApiKey).toContain('sk-e');
    });

    it('should return settings from Redis when stored', async () => {
      redisService.getJson.mockResolvedValue({
        modelName: 'o3',
        apiKey: 'sk-custom-key-abc1234567',
      });
      configService.get.mockReturnValue(undefined);

      const result = await service.getAgentSettings();

      expect(result.modelName).toBe('o3');
      expect(result.hasCustomApiKey).toBe(true);
      expect(result.maskedApiKey).toContain('sk-c');
    });

    it('should fall back to env API key when Redis has null apiKey', async () => {
      redisService.getJson.mockResolvedValue({
        modelName: 'gpt-4o',
        apiKey: null,
      });
      configService.get.mockReturnValue('sk-env-fallback-keyxyz');

      const result = await service.getAgentSettings();

      expect(result.modelName).toBe('gpt-4o');
      expect(result.hasCustomApiKey).toBe(false);
      expect(result.maskedApiKey).not.toBeNull();
    });

    it('should return null maskedApiKey when no key anywhere', async () => {
      redisService.getJson.mockResolvedValue(null);
      configService.get.mockReturnValue(undefined);

      const result = await service.getAgentSettings();

      expect(result.maskedApiKey).toBeNull();
    });

    it('should handle invalid stored data gracefully', async () => {
      // Corrupt data in Redis
      redisService.getJson.mockResolvedValue({ broken: true });
      configService.get.mockReturnValue('');

      const result = await service.getAgentSettings();

      // Should fall back to defaults
      expect(result.modelName).toBe('gpt-5');
      expect(result.hasCustomApiKey).toBe(false);
    });
  });

  describe('updateAgentSettings', () => {
    it('should update model name', async () => {
      redisService.getJson
        .mockResolvedValueOnce({ modelName: 'gpt-5', apiKey: null }) // getRawSettings in update
        .mockResolvedValueOnce({ modelName: 'o3', apiKey: null });   // getRawSettings in getAgentSettings
      redisService.setJson.mockResolvedValue(undefined);
      configService.get.mockReturnValue('');

      const result = await service.updateAgentSettings({ modelName: 'o3' });

      expect(redisService.setJson).toHaveBeenCalledWith(
        'settings:agent',
        expect.objectContaining({ modelName: 'o3' }),
      );
      expect(result.modelName).toBe('o3');
    });

    it('should update custom API key', async () => {
      redisService.getJson
        .mockResolvedValueOnce({ modelName: 'gpt-5', apiKey: null })
        .mockResolvedValueOnce({ modelName: 'gpt-5', apiKey: 'sk-new-custom-key-1234567890' });
      redisService.setJson.mockResolvedValue(undefined);
      configService.get.mockReturnValue('');

      const result = await service.updateAgentSettings({
        apiKey: 'sk-new-custom-key-1234567890',
      });

      expect(redisService.setJson).toHaveBeenCalledWith(
        'settings:agent',
        expect.objectContaining({ apiKey: 'sk-new-custom-key-1234567890' }),
      );
      expect(result.hasCustomApiKey).toBe(true);
    });

    it('should clear custom API key when set to null', async () => {
      redisService.getJson
        .mockResolvedValueOnce({ modelName: 'gpt-5', apiKey: 'sk-old-key-1234567890abcd' })
        .mockResolvedValueOnce({ modelName: 'gpt-5', apiKey: null });
      redisService.setJson.mockResolvedValue(undefined);
      configService.get.mockReturnValue('sk-env-key-1234567890');

      const result = await service.updateAgentSettings({ apiKey: null });

      expect(redisService.setJson).toHaveBeenCalledWith(
        'settings:agent',
        expect.objectContaining({ apiKey: null }),
      );
      expect(result.hasCustomApiKey).toBe(false);
    });

    it('should update both model and key in single call', async () => {
      redisService.getJson
        .mockResolvedValueOnce({ modelName: 'gpt-5', apiKey: null })
        .mockResolvedValueOnce({ modelName: 'gpt-4.1', apiKey: 'sk-both-1234567890abcdef' });
      redisService.setJson.mockResolvedValue(undefined);
      configService.get.mockReturnValue('');

      await service.updateAgentSettings({
        modelName: 'gpt-4.1',
        apiKey: 'sk-both-1234567890abcdef',
      });

      expect(redisService.setJson).toHaveBeenCalledWith(
        'settings:agent',
        expect.objectContaining({
          modelName: 'gpt-4.1',
          apiKey: 'sk-both-1234567890abcdef',
        }),
      );
    });

    it('should not modify fields not present in DTO', async () => {
      redisService.getJson
        .mockResolvedValueOnce({ modelName: 'gpt-5', apiKey: 'sk-keep-this-key-1234567890' })
        .mockResolvedValueOnce({ modelName: 'o4-mini', apiKey: 'sk-keep-this-key-1234567890' });
      redisService.setJson.mockResolvedValue(undefined);
      configService.get.mockReturnValue('');

      await service.updateAgentSettings({ modelName: 'o4-mini' });

      // apiKey should remain unchanged
      expect(redisService.setJson).toHaveBeenCalledWith(
        'settings:agent',
        expect.objectContaining({
          modelName: 'o4-mini',
          apiKey: 'sk-keep-this-key-1234567890',
        }),
      );
    });
  });

  describe('getEffectiveApiKey', () => {
    it('should return custom key when set in Redis', async () => {
      redisService.getJson.mockResolvedValue({
        modelName: 'gpt-5',
        apiKey: 'sk-custom-key-1234567890',
      });

      const key = await service.getEffectiveApiKey();
      expect(key).toBe('sk-custom-key-1234567890');
    });

    it('should return env key when no custom key', async () => {
      redisService.getJson.mockResolvedValue({
        modelName: 'gpt-5',
        apiKey: null,
      });
      configService.get.mockReturnValue('sk-env-key-value');

      const key = await service.getEffectiveApiKey();
      expect(key).toBe('sk-env-key-value');
    });

    it('should return empty string when no key anywhere', async () => {
      redisService.getJson.mockResolvedValue(null);
      configService.get.mockReturnValue(undefined);

      const key = await service.getEffectiveApiKey();
      expect(key).toBe('');
    });
  });

  describe('getEffectiveModel', () => {
    it('should return model from Redis when set', async () => {
      redisService.getJson.mockResolvedValue({
        modelName: 'o3',
        apiKey: null,
      });

      const model = await service.getEffectiveModel();
      expect(model).toBe('o3');
    });

    it('should return default model when Redis is empty', async () => {
      redisService.getJson.mockResolvedValue(null);

      const model = await service.getEffectiveModel();
      expect(model).toBe('gpt-5');
    });
  });
});
