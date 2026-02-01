import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { IngestStrategy, INGEST_STRATEGIES } from './ingest.strategy';
import { SourceType } from '@ingest/dto';

@Injectable()
export class IngestStrategyResolver {
    private readonly strategies = new Map<SourceType, IngestStrategy>();

    constructor(
        @Inject(INGEST_STRATEGIES) strategies: IngestStrategy[],
    ) {
        strategies.forEach((strategy) => {
            this.strategies.set(strategy.sourceType, strategy);
        });
    }

    resolve(type: SourceType): IngestStrategy {
        const strategy = this.strategies.get(type);
        if (!strategy) {
            throw new BadRequestException(`No strategy found for source type: ${type}`);
        }
        return strategy;
    }
}
