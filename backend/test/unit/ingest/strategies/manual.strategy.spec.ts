import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ManualStrategy } from '@ingest/strategies/manual.strategy';

describe('ManualStrategy', () => {
    let strategy: ManualStrategy;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ManualStrategy],
        }).compile();

        strategy = module.get<ManualStrategy>(ManualStrategy);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('ingest', () => {
        it('should return ingest result with content', async () => {
            const content = 'Test content';
            const result = await strategy.ingest(content);

            expect(result).toEqual({
                content,
                title: 'Manual Input',
                sourceUrl: 'manual://input',
                metadata: {},
            });
        });

        it('should throw BadRequestException if content is empty', async () => {
            await expect(strategy.ingest('')).rejects.toThrow(BadRequestException);
        });
    });
});
