import { FeatureFlagService, FeatureFlagsResponse } from '@config/feature-flag.service';
import { ConfigService } from '@nestjs/config';
import { SqliteService } from '@infrastructure/sqlite/sqlite.service';

describe('FeatureFlagService', () => {
    let service: FeatureFlagService;
    let configService: Partial<ConfigService>;
    let sqliteService: Partial<SqliteService>;

    const allEnabledDefaults: FeatureFlagsResponse = {
        confluenceIngest: true,
        webIngest: true,
        fileIngest: true,
        agent: true,
    };

    beforeEach(() => {
        configService = {
            get: jest.fn().mockReturnValue(true),
        };

        sqliteService = {
            exec: jest.fn(),
            get: jest.fn().mockReturnValue(undefined),
            run: jest.fn(),
        };

        service = new FeatureFlagService(
            configService as ConfigService,
            sqliteService as SqliteService,
        );

        service.onModuleInit();
    });

    it('should create feature_flags table on init', () => {
        expect(sqliteService.exec).toHaveBeenCalledWith(
            expect.stringContaining('CREATE TABLE IF NOT EXISTS feature_flags'),
        );
    });

    describe('isEnabled', () => {
        it('should return env default when no SQLite override exists', () => {
            (sqliteService.get as jest.Mock).mockReturnValue(undefined);
            (configService.get as jest.Mock).mockReturnValue(true);

            expect(service.isEnabled('confluenceIngest')).toBe(true);
        });

        it('should return false from env default when env sets false', () => {
            (sqliteService.get as jest.Mock).mockReturnValue(undefined);
            (configService.get as jest.Mock).mockReturnValue(false);

            expect(service.isEnabled('confluenceIngest')).toBe(false);
        });

        it('should return SQLite override when present (enabled)', () => {
            (sqliteService.get as jest.Mock).mockReturnValue({ value: 1 });

            expect(service.isEnabled('confluenceIngest')).toBe(true);
            expect(configService.get).not.toHaveBeenCalled();
        });

        it('should return SQLite override when present (disabled)', () => {
            (sqliteService.get as jest.Mock).mockReturnValue({ value: 0 });

            expect(service.isEnabled('confluenceIngest')).toBe(false);
            expect(configService.get).not.toHaveBeenCalled();
        });
    });

    describe('getAll', () => {
        it('should return all flags with env defaults', () => {
            (sqliteService.get as jest.Mock).mockReturnValue(undefined);
            (configService.get as jest.Mock).mockReturnValue(true);

            const result = service.getAll();

            expect(result).toEqual(allEnabledDefaults);
        });

        it('should reflect SQLite overrides in the result', () => {
            (sqliteService.get as jest.Mock).mockImplementation((sql: string, key: string) => {
                if (key === 'confluenceIngest') return { value: 0 };
                if (key === 'agent') return { value: 0 };
                return undefined;
            });
            (configService.get as jest.Mock).mockReturnValue(true);

            const result = service.getAll();

            expect(result.confluenceIngest).toBe(false);
            expect(result.agent).toBe(false);
            expect(result.webIngest).toBe(true);
            expect(result.fileIngest).toBe(true);
        });
    });

    describe('update', () => {
        it('should upsert flag overrides into SQLite', () => {
            (sqliteService.get as jest.Mock).mockReturnValue(undefined);
            (configService.get as jest.Mock).mockReturnValue(true);

            service.update({ confluenceIngest: false });

            expect(sqliteService.run).toHaveBeenCalledWith(
                'INSERT OR REPLACE INTO feature_flags (key, value) VALUES (?, ?)',
                'confluenceIngest',
                0,
            );
        });

        it('should ignore unknown keys', () => {
            service.update({ unknownFlag: true } as unknown as Partial<FeatureFlagsResponse>);

            expect(sqliteService.run).not.toHaveBeenCalledWith(
                expect.anything(),
                'unknownFlag',
                expect.anything(),
            );
        });

        it('should ignore non-boolean values', () => {
            service.update({ confluenceIngest: 'yes' } as unknown as Partial<FeatureFlagsResponse>);

            expect(sqliteService.run).not.toHaveBeenCalledWith(
                expect.anything(),
                'confluenceIngest',
                expect.anything(),
            );
        });
    });

    describe('resetToDefaults', () => {
        it('should delete all rows from feature_flags table', () => {
            (sqliteService.get as jest.Mock).mockReturnValue(undefined);
            (configService.get as jest.Mock).mockReturnValue(true);

            service.resetToDefaults();

            expect(sqliteService.run).toHaveBeenCalledWith('DELETE FROM feature_flags');
        });

        it('should return all flags with env defaults after reset', () => {
            (sqliteService.get as jest.Mock).mockReturnValue(undefined);
            (configService.get as jest.Mock).mockReturnValue(true);

            const result = service.resetToDefaults();

            expect(result).toEqual(allEnabledDefaults);
        });
    });
});
