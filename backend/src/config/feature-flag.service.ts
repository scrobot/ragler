import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SqliteService } from '@infrastructure/sqlite/sqlite.service';

export const FEATURE_FLAGS = [
    'confluenceIngest',
    'webIngest',
    'fileIngest',
    'agent',
] as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

export interface FeatureFlagsResponse {
    confluenceIngest: boolean;
    webIngest: boolean;
    fileIngest: boolean;
    agent: boolean;
}

interface FeatureFlagRow {
    key: string;
    value: number;
}

@Injectable()
export class FeatureFlagService implements OnModuleInit {
    private readonly logger = new Logger(FeatureFlagService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly sqliteService: SqliteService,
    ) { }

    onModuleInit(): void {
        this.sqliteService.exec(`
      CREATE TABLE IF NOT EXISTS feature_flags (
        key   TEXT PRIMARY KEY,
        value INTEGER NOT NULL
      );
    `);
        this.logger.log('Feature flags table initialized');
    }

    /**
     * Get the env default for a given flag.
     */
    private getEnvDefault(flag: FeatureFlag): boolean {
        return this.configService.get<boolean>(`features.${flag}`, true);
    }

    /**
     * Check whether a feature flag is enabled.
     * SQLite override takes precedence over env default.
     */
    isEnabled(flag: FeatureFlag): boolean {
        const row = this.sqliteService.get<FeatureFlagRow>(
            'SELECT value FROM feature_flags WHERE key = ?',
            flag,
        );

        if (row !== undefined) {
            return row.value === 1;
        }

        return this.getEnvDefault(flag);
    }

    /**
     * Get all feature flags with their current effective values.
     */
    getAll(): FeatureFlagsResponse {
        return {
            confluenceIngest: this.isEnabled('confluenceIngest'),
            webIngest: this.isEnabled('webIngest'),
            fileIngest: this.isEnabled('fileIngest'),
            agent: this.isEnabled('agent'),
        };
    }

    /**
     * Update feature flag overrides. Only provided flags are updated.
     */
    update(flags: Partial<FeatureFlagsResponse>): FeatureFlagsResponse {
        for (const [key, value] of Object.entries(flags)) {
            if (!FEATURE_FLAGS.includes(key as FeatureFlag)) {
                continue;
            }
            if (typeof value !== 'boolean') {
                continue;
            }

            this.sqliteService.run(
                'INSERT OR REPLACE INTO feature_flags (key, value) VALUES (?, ?)',
                key,
                value ? 1 : 0,
            );

            this.logger.log({
                event: 'feature_flag_updated',
                flag: key,
                value,
            });
        }

        return this.getAll();
    }

    /**
     * Remove all overrides, falling back to env defaults.
     */
    resetToDefaults(): FeatureFlagsResponse {
        this.sqliteService.run('DELETE FROM feature_flags');
        this.logger.log({ event: 'feature_flags_reset' });
        return this.getAll();
    }
}
