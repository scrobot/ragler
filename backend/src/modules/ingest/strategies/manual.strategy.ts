import { Injectable, BadRequestException } from '@nestjs/common';
import { IngestStrategy, IngestResult } from './ingest.strategy';
import { SourceType } from '@ingest/dto';

@Injectable()
export class ManualStrategy implements IngestStrategy {
    readonly sourceType: SourceType = 'manual';
    async ingest(content: string): Promise<IngestResult> {
        if (!content) {
            throw new BadRequestException('Content is required for manual source type');
        }

        return {
            content,
            title: 'Manual Input',
            sourceUrl: 'manual://input',
            metadata: {},
        };
    }
}
