import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { IngestStrategyResolver } from '@ingest/strategies/ingest-strategy.resolver';
import { IngestStrategy, INGEST_STRATEGIES } from '@ingest/strategies/ingest.strategy';

describe('IngestStrategyResolver', () => {
    let resolver: IngestStrategyResolver;
    let confluenceStrategy: IngestStrategy;
    let webStrategy: IngestStrategy;
    let manualStrategy: IngestStrategy;

    beforeEach(async () => {
        confluenceStrategy = { sourceType: 'confluence', ingest: jest.fn() } as any;
        webStrategy = { sourceType: 'web', ingest: jest.fn() } as any;
        manualStrategy = { sourceType: 'manual', ingest: jest.fn() } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IngestStrategyResolver,
                {
                    provide: INGEST_STRATEGIES,
                    useValue: [confluenceStrategy, webStrategy, manualStrategy],
                },
            ],
        }).compile();

        resolver = module.get<IngestStrategyResolver>(IngestStrategyResolver);
    });

    it('should be defined', () => {
        expect(resolver).toBeDefined();
    });

    describe('resolve', () => {
        it('should return confluence strategy', () => {
            expect(resolver.resolve('confluence')).toBe(confluenceStrategy);
        });

        it('should return web strategy', () => {
            expect(resolver.resolve('web')).toBe(webStrategy);
        });

        it('should return manual strategy', () => {
            expect(resolver.resolve('manual')).toBe(manualStrategy);
        });

        it('should throw BadRequestException for unknown strategy', () => {
            expect(() => resolver.resolve('unknown' as any)).toThrow(BadRequestException);
        });
    });
});
