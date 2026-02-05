import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { QdrantClientService } from '@infrastructure/qdrant';
import { LlmService } from '@llm/llm.service';
import { SearchRequestDto, SearchResponseDto, SearchResultDto } from './dto';

@Injectable()
export class VectorService {
  private readonly logger = new Logger(VectorService.name);

  constructor(
    private readonly qdrantClient: QdrantClientService,
    private readonly llmService: LlmService,
  ) { }

  async search(dto: SearchRequestDto): Promise<SearchResponseDto> {
    const startTime = Date.now();
    const collectionName = `kb_${dto.collectionId}`;

    const exists = await this.qdrantClient.collectionExists(collectionName);
    if (!exists) {
      this.logger.warn({
        event: 'search_collection_not_found',
        collectionId: dto.collectionId,
      });
      throw new NotFoundException(`Collection ${dto.collectionId} not found`);
    }

    const queryVector = await this.llmService.generateEmbedding(dto.query);

    const searchResults = await this.qdrantClient.search(
      collectionName,
      queryVector,
      dto.limit || 10,
    );

    const results: SearchResultDto[] = (searchResults as any[]).map((result) => ({
      id: String(result.id),
      score: result.score,
      content: result.payload?.content || '',
      sourceUrl: result.payload?.source_url || '',
      sourceType: result.payload?.source_type || '',
    }));

    const durationMs = Date.now() - startTime;
    this.logger.log({
      event: 'search_complete',
      collectionId: dto.collectionId,
      resultCount: results.length,
      limit: dto.limit || 10,
      durationMs,
    });

    return {
      results,
      total: results.length,
      query: dto.query,
    };
  }
}
