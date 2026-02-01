import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '../../infrastructure/redis';
import { IngestRequestDto, IngestResponseDto, SourceType } from './dto';
import { ConfluenceStrategy } from './strategies/confluence.strategy';
import { WebStrategy } from './strategies/web.strategy';

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
    private readonly confluenceStrategy: ConfluenceStrategy,
    private readonly webStrategy: WebStrategy,
    private readonly configService: ConfigService,
  ) { }

  async ingest(dto: IngestRequestDto, userId: string): Promise<IngestResponseDto> {
    const sessionId = `session_${uuidv4()}`;
    let content = '';
    let sourceUrl = '';

    switch (dto.sourceType) {
      case 'manual':
        if (!dto.content) {
          throw new BadRequestException('Content is required for manual source type');
        }
        content = dto.content;
        sourceUrl = 'manual://input';
        break;

      case 'confluence':
        if (!dto.url) {
          throw new BadRequestException('URL is required for confluence source type');
        }
        sourceUrl = dto.url;
        // TODO: Uncomment when confluence strategy is implemented
        // const confluenceResult = await this.confluenceStrategy.ingest(dto.url);
        // content = confluenceResult.content;
        content = `[Placeholder] Content from Confluence: ${dto.url}`;
        break;

      case 'web':
        if (!dto.url) {
          throw new BadRequestException('URL is required for web source type');
        }
        sourceUrl = dto.url;
        // TODO: Uncomment when web strategy is implemented
        // const webResult = await this.webStrategy.ingest(dto.url);
        // content = webResult.content;
        content = `[Placeholder] Content from web: ${dto.url}`;
        break;
    }

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
