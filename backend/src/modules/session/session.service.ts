import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { IngestService } from '@ingest/ingest.service';
import { QdrantClientService } from '@infrastructure/qdrant';
import { LlmService } from '@llm/llm.service';
import {
  SessionResponseDto,
  MergeChunksDto,
  SplitChunkDto,
  UpdateChunkDto,
  PublishDto,
  PreviewResponseDto,
  PublishResponseDto,
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

  async getSession(sessionId: string): Promise<SessionResponseDto> {
    const session = await this.ingestService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return {
      sessionId: session.sessionId,
      sourceUrl: session.sourceUrl,
      status: session.status,
      chunks: session.chunks,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
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

    this.logger.log(`Merged ${dto.chunkIds.length} chunks in session ${sessionId}`);

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

    this.logger.log(`Split chunk ${chunkId} into ${newChunks.length} chunks in session ${sessionId}`);

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

    await this.ingestService.updateSession(sessionId, { status: 'PREVIEW' });

    this.logger.log(`Session ${sessionId} locked for preview`);

    return {
      sessionId,
      status: 'PREVIEW',
      chunks: session.chunks,
      isValid: warnings.length === 0,
      warnings,
    };
  }

  async publish(sessionId: string, dto: PublishDto, userId: string): Promise<PublishResponseDto> {
    const session = await this.ingestService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const collectionName = `kb_${dto.targetCollectionId}`;
    const collectionExists = await this.qdrantClient.collectionExists(collectionName);
    if (!collectionExists) {
      throw new NotFoundException(`Collection ${dto.targetCollectionId} not found`);
    }

    // Filter valid chunks FIRST (before any operations)
    const validChunks = session.chunks.filter((c) => c.text.trim());

    // If no valid chunks, skip embedding generation and Qdrant operations
    if (validChunks.length === 0) {
      await this.ingestService.deleteSession(sessionId);
      this.logger.log(`Published 0 chunks from session ${sessionId} (all chunks empty)`);
      return {
        sessionId,
        publishedChunks: 0,
        collectionId: dto.targetCollectionId,
      };
    }

    // Generate embeddings BEFORE any Qdrant delete (atomic safety)
    // If embedding fails, we don't lose existing data
    const texts = validChunks.map((c) => c.text);
    const embeddings = await this.llmService.generateEmbeddings(texts, sessionId);

    const sourceId = crypto.createHash('md5').update(session.sourceUrl).digest('hex');
    const now = new Date().toISOString();

    // Build points with real embeddings
    const points = validChunks.map((chunk, index) => ({
      id: uuidv4(),
      vector: embeddings[index],
      payload: {
        content: chunk.text,
        source_id: sourceId,
        source_url: session.sourceUrl,
        source_type: session.sourceType,
        last_modified_by: userId,
        last_modified_at: now,
        revision: 1,
      },
    }));

    // Atomic replacement: delete old, then upsert new
    await this.qdrantClient.deletePointsByFilter(collectionName, {
      must: [{ key: 'source_id', match: { value: sourceId } }],
    });

    await this.qdrantClient.upsertPoints(collectionName, points);

    await this.ingestService.deleteSession(sessionId);

    this.logger.log(`Published ${points.length} chunks from session ${sessionId} to collection ${dto.targetCollectionId}`);

    return {
      sessionId,
      publishedChunks: points.length,
      collectionId: dto.targetCollectionId,
    };
  }
}
