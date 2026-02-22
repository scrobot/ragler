import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '@infrastructure/redis';
import { LlmService } from '@llm/llm.service';
import {
  IngestConfluenceDto,
  IngestWebDto,
  IngestManualDto,
  IngestResponseDto,
  SourceType,
} from './dto';
import { IngestStrategyResolver } from './strategies/ingest-strategy.resolver';

export interface SessionMetadata {
  filename?: string;
  fileSize?: number;
  mimeType?: string;
  [key: string]: unknown;
}

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
  /**
   * Raw HTML/XML content for source preview.
   * Present for web (HTML) and confluence (storage format XML) sources.
   * Undefined for manual text sources.
   */
  rawContent?: string;
  /** Document metadata from ingestion strategy */
  metadata?: SessionMetadata;
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
    private readonly llmService: LlmService,
  ) { }

  async ingestConfluence(dto: IngestConfluenceDto, userId: string): Promise<IngestResponseDto> {
    const input = dto.pageId ?? dto.url;
    // We already validated that one exists in the DTO
    return this.createSession(input!, 'confluence', userId);
  }

  async ingestWeb(dto: IngestWebDto, userId: string): Promise<IngestResponseDto> {
    return this.createSession(dto.url, 'web', userId);
  }

  async ingestManual(dto: IngestManualDto, userId: string): Promise<IngestResponseDto> {
    return this.createSession(dto.content, 'manual', userId);
  }

  async ingestFile(file: Express.Multer.File, userId: string): Promise<IngestResponseDto> {
    const input = JSON.stringify({
      buffer: file.buffer.toString('base64'),
      filename: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    });
    return this.createSession(input, 'file', userId);
  }

  private async createSession(
    input: string,
    sourceType: SourceType,
    userId: string,
  ): Promise<IngestResponseDto> {
    const sessionId = `session_${uuidv4()}`;
    const strategy = this.strategyResolver.resolve(sourceType);

    const { content, sourceUrl, rawContent, metadata } = await strategy.ingest(input);

    // Generate chunks using LLM
    this.logger.log({ event: 'chunking_start', sessionId, userId, sourceType });
    const startTime = Date.now();

    let chunks: Array<{ id: string; text: string; isDirty: boolean }> = [];
    try {
      chunks = await this.llmService.chunkContent(content, sessionId);
      const duration = Date.now() - startTime;
      this.logger.log({
        event: 'chunking_success',
        sessionId,
        userId,
        chunkCount: chunks.length,
        durationMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error({
        event: 'chunking_failure',
        sessionId,
        userId,
        durationMs: duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }

    const sessionData: SessionData = {
      sessionId,
      sourceUrl,
      sourceType,
      userId,
      status: 'DRAFT',
      content,
      chunks,
      rawContent,
      metadata: metadata as SessionMetadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.redisService.setJson(
      `session:${sessionId}`,
      sessionData,
      this.configService.get<number>('session.ttl'),
    );

    this.logger.log({
      event: 'session_created',
      sessionId,
      userId,
      sourceType,
      sourceUrl,
      chunkCount: chunks.length,
    });

    return {
      sessionId,
      sourceType,
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

    this.logger.log({
      event: 'session_updated',
      sessionId,
      updatedFields: Object.keys(data),
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.redisService.del(`session:${sessionId}`);
    this.logger.log({
      event: 'session_deleted',
      sessionId,
    });
  }

  async listSessions(): Promise<SessionData[]> {
    const keys = await this.redisService.scanKeys('session:session_*');
    if (keys.length === 0) {
      this.logger.log({
        event: 'sessions_scanned',
        count: 0,
      });
      return [];
    }

    const sessions: SessionData[] = [];
    for (const key of keys) {
      const session = await this.redisService.getJson<SessionData>(key);
      if (session) {
        sessions.push(session);
      }
    }

    this.logger.log({
      event: 'sessions_scanned',
      keysFound: keys.length,
      validSessions: sessions.length,
    });

    // Sort by createdAt descending (newest first)
    return sessions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
}
