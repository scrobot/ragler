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
    const collectionName = `kb_${dto.collectionId}`;

    const exists = await this.qdrantClient.collectionExists(collectionName);
    if (!exists) {
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

    this.logger.log(`Search in collection ${dto.collectionId}: found ${results.length} results`);

    return {
      results,
      total: results.length,
      query: dto.query,
    };
  }
}
