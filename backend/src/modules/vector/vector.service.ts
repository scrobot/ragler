import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { QdrantClientService } from '@infrastructure/qdrant';
import { LlmService } from '@llm/llm.service';
import { NavigationIntentClassifier } from '@llm/classifiers/navigation-intent-classifier';
import { SearchRequestDto, SearchResponseDto, SearchResultDto, SearchFilters } from './dto';
import type { QdrantPayload } from './dto/payload.dto';

@Injectable()
export class VectorService {
  private readonly logger = new Logger(VectorService.name);
  private readonly navigationIntentClassifier: NavigationIntentClassifier;

  constructor(
    private readonly qdrantClient: QdrantClientService,
    private readonly llmService: LlmService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('openai.apiKey');
    const openai = new OpenAI({ apiKey });
    this.navigationIntentClassifier = new NavigationIntentClassifier(openai, {
      model: 'gpt-4o-mini',
      timeout: 5000,
      maxRetries: 2,
    });
  }

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

    // Generate query embedding
    const queryVector = await this.llmService.generateEmbedding(dto.query);

    // Build Qdrant filter from request filters + navigation intent
    const filter = await this.buildQdrantFilter(dto.query, dto.filters);

    // Perform search with filter
    const searchResults = await this.qdrantClient.search(
      collectionName,
      queryVector,
      dto.limit || 10,
      filter,
    );

    // Map results to enhanced DTO with structured metadata
    const results: SearchResultDto[] = (searchResults as any[]).map((result) => {
      const payload = result.payload as QdrantPayload;

      return {
        id: String(result.id),
        score: result.score,
        content: payload.chunk.text,
        doc: {
          url: payload.doc.url,
          title: payload.doc.title,
          source_type: payload.doc.source_type,
          revision: payload.doc.revision,
        },
        chunk: {
          type: payload.chunk.type,
          heading_path: payload.chunk.heading_path,
          section: payload.chunk.section,
          lang: payload.chunk.lang,
        },
        tags: payload.tags,
      };
    });

    const durationMs = Date.now() - startTime;
    this.logger.log({
      event: 'search_complete',
      collectionId: dto.collectionId,
      query: dto.query,
      resultCount: results.length,
      limit: dto.limit || 10,
      filterApplied: !!filter,
      durationMs,
    });

    return {
      results,
      total: results.length,
      query: dto.query,
    };
  }

  /**
   * Build Qdrant filter from search filters and navigation intent detection
   */
  private async buildQdrantFilter(
    query: string,
    filters?: SearchFilters,
  ): Promise<any> {
    const conditions: any[] = [];

    // Default: exclude navigation chunks unless query has navigation intent
    const must_not_conditions: any[] = [];

    if (filters?.exclude_navigation !== false) {
      const hasNavigationIntent = await this.detectNavigationIntent(query);

      if (!hasNavigationIntent) {
        must_not_conditions.push({
          key: 'chunk.type',
          match: {
            value: 'navigation',
          },
        });
      }
    }

    // Filter by source_type
    if (filters?.source_types && filters.source_types.length > 0) {
      conditions.push({
        key: 'doc.source_type',
        match: {
          any: filters.source_types,
        },
      });
    }

    // Filter by chunk_type
    if (filters?.chunk_types && filters.chunk_types.length > 0) {
      conditions.push({
        key: 'chunk.type',
        match: {
          any: filters.chunk_types,
        },
      });
    }

    // Filter by tags
    if (filters?.tags && filters.tags.length > 0) {
      conditions.push({
        key: 'tags',
        match: {
          any: filters.tags,
        },
      });
    }

    // Date range filter
    if (filters?.date_range) {
      if (filters.date_range.from) {
        conditions.push({
          key: 'doc.last_modified_at',
          range: {
            gte: filters.date_range.from,
          },
        });
      }
      if (filters.date_range.to) {
        conditions.push({
          key: 'doc.last_modified_at',
          range: {
            lte: filters.date_range.to,
          },
        });
      }
    }

    // Return filter object if there are conditions
    if (conditions.length === 0 && must_not_conditions.length === 0) {
      return undefined;
    }

    const filter: any = {};
    if (conditions.length > 0) {
      filter.must = conditions;
    }
    if (must_not_conditions.length > 0) {
      filter.must_not = must_not_conditions;
    }

    return filter;
  }

  /**
   * Detect if query has navigation intent using LLM classifier
   */
  private async detectNavigationIntent(query: string): Promise<boolean> {
    try {
      return await this.navigationIntentClassifier.hasNavigationIntent(query, 0.6);
    } catch (error) {
      // If classification fails, default to excluding navigation (safe default)
      this.logger.warn({
        event: 'navigation_intent_classification_failed',
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}
