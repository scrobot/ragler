import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '@infrastructure/redis';
import { IngestRequestDto, IngestResponseDto, SourceType } from './dto';
import { IngestStrategyResolver } from './strategies/ingest-strategy.resolver';

export interface SessionData {
  sessionId: string;
  sourceUrl: string;
  sourceType: SourceType;
  userId: string;
  status: 'DRAFT' | 'PREVIEW' | 'PUBLISHED';
  content: string;
  chunks: Array<{
    id: string;
    text: string;
    isDirty: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly strategyResolver: IngestStrategyResolver,
    private readonly configService: ConfigService,
  ) { }

  async ingest(dto: IngestRequestDto, userId: string): Promise<IngestResponseDto> {
    const sessionId = `session_${uuidv4()}`;

    const strategy = this.strategyResolver.resolve(dto.sourceType);

    // Determine input based on source type
    let input: string | undefined;
    if (dto.sourceType === 'manual') {
      input = dto.content;
    } else if (dto.sourceType === 'confluence') {
      // Confluence supports both pageId and url; prefer pageId
      input = dto.pageId ?? dto.url;
    } else {
      input = dto.url;
    }

    if (!input) {
      throw new BadRequestException(
        dto.sourceType === 'manual'
          ? 'Content is required for manual source type'
          : dto.sourceType === 'confluence'
            ? 'URL or pageId is required for confluence source type'
            : `URL is required for ${dto.sourceType} source type`,
      );
    }

    const { content, sourceUrl } = await strategy.ingest(input);

    const sessionData: SessionData = {
      sessionId,
      sourceUrl,
      sourceType: dto.sourceType,
      userId,
      status: 'DRAFT',
      content,
      chunks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.redisService.setJson(
      `session:${sessionId}`,
      sessionData,
      this.configService.get<number>('session.ttl'),
    );

    this.logger.log(`Created session ${sessionId} for user ${userId}`);

    return {
      sessionId,
      sourceType: dto.sourceType,
      sourceUrl,
      status: sessionData.status,
      createdAt: sessionData.createdAt,
    };
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    return this.redisService.getJson<SessionData>(`session:${sessionId}`);
  }

  async updateSession(sessionId: string, data: Partial<SessionData>): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new BadRequestException(`Session ${sessionId} not found`);
    }

    const updated: SessionData = {
      ...session,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    await this.redisService.setJson(
      `session:${sessionId}`,
      updated,
      this.configService.get<number>('session.ttl'),
    );
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.redisService.del(`session:${sessionId}`);
  }
}
