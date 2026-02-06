import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { IngestService } from '@ingest/ingest.service';
import { QdrantClientService } from '@infrastructure/qdrant';
import { LlmService } from '@llm/llm.service';
import type { DocMetadata, QdrantPayload } from '@modules/vector/dto/payload.dto';
import {
  SessionResponseDto,
  SessionListResponseDto,
  MergeChunksDto,
  SplitChunkDto,
  UpdateChunkDto,
  PublishDto,
  PreviewResponseDto,
  PublishResponseDto,
  DeleteSessionResponseDto,
} from './dto';
import { UserRole } from '@common/decorators';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly ingestService: IngestService,
    private readonly qdrantClient: QdrantClientService,
    private readonly llmService: LlmService,
  ) { }

  async listSessions(): Promise<SessionListResponseDto> {
    const sessions = await this.ingestService.listSessions();

    this.logger.log({
      event: 'sessions_listed',
      count: sessions.length,
    });

    return {
      sessions: sessions.map((session) => ({
        sessionId: session.sessionId,
        sourceUrl: session.sourceUrl,
        sourceType: session.sourceType,
        status: session.status,
        chunkCount: session.chunks.length,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })),
      total: sessions.length,
    };
  }

  async getSession(sessionId: string): Promise<SessionResponseDto> {
    const session = await this.ingestService.getSession(sessionId);
    if (!session) {
      this.logger.warn({
        event: 'session_not_found',
        sessionId,
      });
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    this.logger.log({
      event: 'session_retrieved',
      sessionId,
      status: session.status,
      chunkCount: session.chunks.length,
    });

    return {
      sessionId: session.sessionId,
      sourceUrl: session.sourceUrl,
      sourceType: session.sourceType,
      status: session.status,
      chunks: session.chunks,
      rawContent: session.rawContent ?? null,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  async deleteSession(sessionId: string, userId: string): Promise<DeleteSessionResponseDto> {
    this.logger.log({
      event: 'session_delete_start',
      sessionId,
      userId,
    });

    const session = await this.ingestService.getSession(sessionId);
    if (!session) {
      this.logger.warn({
        event: 'session_delete_not_found',
        sessionId,
        userId,
      });
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (session.status === 'PUBLISHED') {
      this.logger.warn({
        event: 'session_delete_invalid_status',
        sessionId,
        userId,
        status: session.status,
      });
      throw new BadRequestException('Cannot delete a published session');
    }

    await this.ingestService.deleteSession(sessionId);

    this.logger.log({
      event: 'session_delete_success',
      sessionId,
      userId,
      previousStatus: session.status,
    });

    return {
      sessionId,
      deleted: true,
    };
  }

  async generateChunks(sessionId: string, userId: string): Promise<SessionResponseDto> {
    const startTime = Date.now();
    this.logger.log({ event: 'chunking_start', sessionId, userId });

    const session = await this.ingestService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (session.status !== 'DRAFT') {
      throw new BadRequestException('Cannot generate chunks in non-DRAFT status');
    }

    if (!session.content || !session.content.trim()) {
      throw new BadRequestException('Session has no content to chunk');
    }

    try {
      const chunks = await this.llmService.chunkContent(session.content, sessionId);

      await this.ingestService.updateSession(sessionId, { chunks });

      const duration = Date.now() - startTime;
      this.logger.log({
        event: 'chunking_success',
        sessionId,
        userId,
        chunkCount: chunks.length,
        durationMs: duration,
      });

      return this.getSession(sessionId);
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
  }

  async mergeChunks(sessionId: string, dto: MergeChunksDto): Promise<SessionResponseDto> {
    const session = await this.ingestService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (session.status !== 'DRAFT') {
      throw new BadRequestException('Cannot modify chunks in non-DRAFT status');
    }

    const chunksToMerge = session.chunks.filter((c) => dto.chunkIds.includes(c.id));
    if (chunksToMerge.length !== dto.chunkIds.length) {
      throw new BadRequestException('Some chunk IDs not found in session');
    }

    const mergedText = chunksToMerge.map((c) => c.text).join('\n\n');
    const newChunkId = `chunk_${uuidv4()}`;

    const updatedChunks = session.chunks.filter((c) => !dto.chunkIds.includes(c.id));
    updatedChunks.push({ id: newChunkId, text: mergedText, isDirty: true });

    await this.ingestService.updateSession(sessionId, { chunks: updatedChunks });

    this.logger.log({
      event: 'chunks_merged',
      sessionId,
      mergedCount: dto.chunkIds.length,
      newChunkId,
    });

    return this.getSession(sessionId);
  }

  async splitChunk(
    sessionId: string,
    chunkId: string,
    dto: SplitChunkDto,
    userRole: UserRole,
  ): Promise<SessionResponseDto> {
    if (userRole === UserRole.L2) {
      throw new ForbiddenException('Split operation is not available in Simple Mode');
    }

    const session = await this.ingestService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (session.status !== 'DRAFT') {
      throw new BadRequestException('Cannot modify chunks in non-DRAFT status');
    }

    const chunkIndex = session.chunks.findIndex((c) => c.id === chunkId);
    if (chunkIndex === -1) {
      throw new NotFoundException(`Chunk ${chunkId} not found in session`);
    }

    const chunk = session.chunks[chunkIndex];
    let newChunks: Array<{ id: string; text: string; isDirty: boolean }> = [];

    if (dto.newTextBlocks && dto.newTextBlocks.length > 0) {
      newChunks = dto.newTextBlocks.map((text) => ({
        id: `chunk_${uuidv4()}`,
        text,
        isDirty: true,
      }));
    } else if (dto.splitPoints && dto.splitPoints.length > 0) {
      const text = chunk.text;
      const points = [0, ...dto.splitPoints.sort((a, b) => a - b), text.length];

      for (let i = 0; i < points.length - 1; i++) {
        const sliceText = text.slice(points[i], points[i + 1]).trim();
        if (sliceText) {
          newChunks.push({
            id: `chunk_${uuidv4()}`,
            text: sliceText,
            isDirty: true,
          });
        }
      }
    } else {
      throw new BadRequestException('Either splitPoints or newTextBlocks must be provided');
    }

    const updatedChunks = [
      ...session.chunks.slice(0, chunkIndex),
      ...newChunks,
      ...session.chunks.slice(chunkIndex + 1),
    ];

    await this.ingestService.updateSession(sessionId, { chunks: updatedChunks });

    this.logger.log({
      event: 'chunk_split',
      sessionId,
      originalChunkId: chunkId,
      newChunkCount: newChunks.length,
    });

    return this.getSession(sessionId);
  }

  async updateChunk(
    sessionId: string,
    chunkId: string,
    dto: UpdateChunkDto,
  ): Promise<SessionResponseDto> {
    const session = await this.ingestService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (session.status !== 'DRAFT') {
      throw new BadRequestException('Cannot modify chunks in non-DRAFT status');
    }

    const chunkIndex = session.chunks.findIndex((c) => c.id === chunkId);
    if (chunkIndex === -1) {
      throw new NotFoundException(`Chunk ${chunkId} not found in session`);
    }

    session.chunks[chunkIndex] = {
      ...session.chunks[chunkIndex],
      text: dto.text,
      isDirty: true,
    };

    await this.ingestService.updateSession(sessionId, { chunks: session.chunks });

    this.logger.log({
      event: 'chunk_updated',
      sessionId,
      chunkId,
    });

    return this.getSession(sessionId);
  }

  async preview(sessionId: string): Promise<PreviewResponseDto> {
    const session = await this.ingestService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const warnings: string[] = [];

    if (session.chunks.length === 0) {
      warnings.push('No chunks to publish');
    }

    const emptyChunks = session.chunks.filter((c) => !c.text.trim());
    if (emptyChunks.length > 0) {
      warnings.push(`${emptyChunks.length} empty chunks found`);
    }

    if (warnings.length > 0) {
      this.logger.warn({
        event: 'preview_validation_failed',
        sessionId,
        warnings,
        warningCount: warnings.length,
      });
    }

    await this.ingestService.updateSession(sessionId, { status: 'PREVIEW' });

    this.logger.log({
      event: 'preview_lock',
      sessionId,
      isValid: warnings.length === 0,
      chunkCount: session.chunks.length,
    });

    return {
      sessionId,
      status: 'PREVIEW',
      chunks: session.chunks,
      isValid: warnings.length === 0,
      warnings,
    };
  }

  async publish(sessionId: string, dto: PublishDto, userId: string): Promise<PublishResponseDto> {
    const startTime = Date.now();
    const collectionId = dto.targetCollectionId;

    this.logger.log({
      event: 'publish_start',
      sessionId,
      userId,
      collectionId,
    });

    try {
      const session = await this.ingestService.getSession(sessionId);
      if (!session) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      const collectionName = `kb_${collectionId}`;
      const collectionExists = await this.qdrantClient.collectionExists(collectionName);
      if (!collectionExists) {
        throw new NotFoundException(`Collection ${collectionId} not found`);
      }

      const sourceId = crypto.createHash('md5').update(session.sourceUrl).digest('hex');
      const now = new Date().toISOString();

      // Build doc metadata for v2 chunking
      const docMetadata: DocMetadata = {
        source_type: session.sourceType,
        source_id: sourceId,
        url: session.sourceUrl,
        space_key: null, // TODO: Extract from Confluence metadata when available
        title: null, // TODO: Extract from document when available
        revision: 1, // TODO: Implement revision tracking
        last_modified_at: now,
        last_modified_by: userId,
      };

      // Use rawContent for Confluence (storage XML with structure) or content for others
      const contentForChunking = session.rawContent || session.content;

      // Chunk content with v2 schema (structured chunking + tags + metadata)
      const chunksV2 = await this.llmService.chunkContentV2(
        contentForChunking,
        docMetadata,
        sessionId
      );

      // If no chunks produced, cleanup and return
      if (chunksV2.length === 0) {
        await this.ingestService.deleteSession(sessionId);
        const durationMs = Date.now() - startTime;
        this.logger.log({
          event: 'publish_success',
          sessionId,
          userId,
          collectionId,
          publishedChunks: 0,
          durationMs,
        });
        return {
          sessionId,
          publishedChunks: 0,
          collectionId,
        };
      }

      // Generate embeddings BEFORE any Qdrant delete (atomic safety)
      // If embedding fails, we don't lose existing data
      const texts = chunksV2.map((c) => c.chunk.text);
      const embeddings = await this.llmService.generateEmbeddings(texts, sessionId);

      // Build points with v2 payload structure
      const points = chunksV2.map((chunkPayload, index) => ({
        id: chunkPayload.chunk.id, // Use stable v2 chunk ID
        vector: embeddings[index],
        payload: chunkPayload as Record<string, unknown>,
      }));

      // Atomic replacement: delete old, then upsert new
      await this.qdrantClient.deletePointsByFilter(collectionName, {
        must: [{ key: 'doc.source_id', match: { value: sourceId } }],
      });

      this.logger.log({
        event: 'publish_delete_done',
        sessionId,
        sourceId,
        collectionId,
      });

      await this.qdrantClient.upsertPoints(collectionName, points);

      this.logger.log({
        event: 'publish_upsert_done',
        sessionId,
        collectionId,
        pointCount: points.length,
        typeDistribution: this.getTypeDistribution(chunksV2),
      });

      await this.ingestService.deleteSession(sessionId);

      const durationMs = Date.now() - startTime;
      this.logger.log({
        event: 'publish_success',
        sessionId,
        userId,
        collectionId,
        sourceId,
        publishedChunks: points.length,
        durationMs,
      });

      return {
        sessionId,
        publishedChunks: points.length,
        collectionId,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.logger.error({
        event: 'publish_failure',
        sessionId,
        userId,
        collectionId,
        durationMs,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      });
      throw error;
    }
  }

  /**
   * Get chunk type distribution for observability
   */
  private getTypeDistribution(chunks: QdrantPayload[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const chunk of chunks) {
      const type = chunk.chunk.type;
      distribution[type] = (distribution[type] || 0) + 1;
    }
    return distribution;
  }
}
