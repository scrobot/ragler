import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { QdrantClientService } from '@infrastructure/qdrant';
import { LlmService } from '@llm/llm.service';
import { CollectionService } from './collection.service';
import {
  ListChunksQuery,
  EditorChunkResponse,
  EditorChunkListResponse,
  EditorCreateChunkInput,
  EditorUpdateChunkInput,
  EditorSplitChunkInput,
  EditorMergeChunksInput,
  ReorderChunksInput,
  UpdateQualityScoreInput,
} from './dto';
import {
  createDefaultEditorMetadata,
  createDefaultAcl,
  QdrantPayload,
} from '@modules/vector/dto/payload.dto';

interface QdrantPoint {
  id: string;
  payload: QdrantPayload;
  vector?: number[];
}

@Injectable()
export class ChunkService {
  private readonly logger = new Logger(ChunkService.name);

  constructor(
    private readonly qdrantClient: QdrantClientService,
    private readonly llmService: LlmService,
    private readonly collectionService: CollectionService,
  ) {}

  /**
   * Get the Qdrant collection name for a given collection ID
   */
  private getCollectionName(collectionId: string): string {
    return `kb_${collectionId}`;
  }

  /**
   * List chunks in a collection with pagination and sorting
   */
  async listChunks(
    collectionId: string,
    query: ListChunksQuery,
  ): Promise<EditorChunkListResponse> {
    const collectionName = this.getCollectionName(collectionId);

    // Verify collection exists
    const exists = await this.qdrantClient.collectionExists(collectionName);
    if (!exists) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }

    // Get total count
    const total = await this.qdrantClient.countPoints(collectionName);

    // Determine order field
    const orderField =
      query.sortBy === 'position'
        ? 'editor.position'
        : query.sortBy === 'quality_score'
          ? 'editor.quality_score'
          : 'doc.last_modified_at';

    // Scroll with pagination and ordering
    const { points } = await this.qdrantClient.scrollWithOrder(collectionName, {
      limit: query.limit,
      offset: query.offset,
      orderBy: {
        field: orderField,
        direction: query.sortOrder,
      },
    });

    const chunks = (points as QdrantPoint[]).map((point) =>
      this.mapPointToChunkResponse(point),
    );

    this.logger.log({
      event: 'chunks_listed',
      collectionId,
      total,
      returned: chunks.length,
      offset: query.offset,
    });

    return {
      chunks,
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  /**
   * Get a single chunk by ID
   */
  async getChunk(
    collectionId: string,
    chunkId: string,
  ): Promise<EditorChunkResponse> {
    const collectionName = this.getCollectionName(collectionId);

    const points = await this.qdrantClient.getPoints(collectionName, [chunkId]);

    if (!points || points.length === 0) {
      throw new NotFoundException(
        `Chunk ${chunkId} not found in collection ${collectionId}`,
      );
    }

    return this.mapPointToChunkResponse(points[0] as QdrantPoint);
  }

  /**
   * Create a new chunk in a collection
   */
  async createChunk(
    collectionId: string,
    dto: EditorCreateChunkInput,
    userId: string,
  ): Promise<EditorChunkResponse> {
    const collectionName = this.getCollectionName(collectionId);
    const startTime = Date.now();

    // Verify collection exists
    await this.collectionService.findOne(collectionId);

    // Generate embedding
    const [embedding] = await this.llmService.generateEmbeddings(
      [dto.content],
      `create_chunk_${collectionId}`,
    );

    // Compute content hash
    const contentHash = this.computeContentHash(dto.content);
    const chunkId = uuidv4();

    // Determine position (append to end if not specified)
    let position = dto.position;
    if (position === undefined) {
      const total = await this.qdrantClient.countPoints(collectionName);
      position = total;
    }

    // Build payload
    const payload: QdrantPayload = {
      doc: {
        source_type: 'manual',
        source_id: `editor_${collectionId}`,
        url: `manual://editor/${collectionId}/${chunkId}`,
        space_key: null,
        title: null,
        revision: 1,
        last_modified_at: new Date().toISOString(),
        last_modified_by: userId,
      },
      chunk: {
        id: chunkId,
        index: position,
        type: dto.chunkType,
        heading_path: dto.headingPath,
        section: dto.headingPath.length > 0 ? dto.headingPath.join(' / ') : null,
        text: dto.content,
        content_hash: contentHash,
        lang: this.detectLanguage(dto.content),
      },
      tags: dto.tags,
      acl: createDefaultAcl(),
      editor: createDefaultEditorMetadata(position, userId),
    };

    // Upsert to Qdrant
    await this.qdrantClient.upsertPoints(collectionName, [
      {
        id: chunkId,
        vector: embedding,
        payload: payload as unknown as Record<string, unknown>,
      },
    ]);

    const duration = Date.now() - startTime;
    this.logger.log({
      event: 'chunk_created',
      collectionId,
      chunkId,
      userId,
      contentLength: dto.content.length,
      durationMs: duration,
    });

    return this.mapPointToChunkResponse({
      id: chunkId,
      payload,
    });
  }

  /**
   * Update an existing chunk
   */
  async updateChunk(
    collectionId: string,
    chunkId: string,
    dto: EditorUpdateChunkInput,
    userId: string,
  ): Promise<EditorChunkResponse> {
    const collectionName = this.getCollectionName(collectionId);
    const startTime = Date.now();

    // Get existing chunk
    const existingChunk = await this.getChunk(collectionId, chunkId);

    // Determine new content
    const newContent = dto.content ?? existingChunk.content;
    const contentChanged = dto.content && dto.content !== existingChunk.content;

    // Generate new embedding if content changed
    let embedding: number[] | undefined;
    if (contentChanged) {
      [embedding] = await this.llmService.generateEmbeddings(
        [newContent],
        `update_chunk_${chunkId}`,
      );
    }

    // Compute new content hash if content changed
    const contentHash = contentChanged
      ? this.computeContentHash(newContent)
      : `sha256:preserved`;

    // Build updated payload
    const updatedPayload: Partial<QdrantPayload> = {
      chunk: {
        ...existingChunk.chunk,
        id: chunkId,
        index: existingChunk.editor?.position ?? 0,
        text: newContent,
        content_hash: contentHash,
        type: dto.chunkType ?? existingChunk.chunk.type,
        heading_path: dto.headingPath ?? existingChunk.chunk.heading_path,
        section:
          dto.headingPath?.join(' / ') ?? existingChunk.chunk.section,
      },
      tags: dto.tags ?? existingChunk.tags,
      editor: {
        ...(existingChunk.editor ?? createDefaultEditorMetadata(0, userId)),
        last_edited_at: new Date().toISOString(),
        last_edited_by: userId,
        edit_count: (existingChunk.editor?.edit_count ?? 0) + 1,
      },
    };

    if (embedding) {
      // Full upsert with new embedding
      const points = await this.qdrantClient.getPoints(collectionName, [
        chunkId,
      ]);
      const existingPoint = points[0] as { payload: QdrantPayload };
      const mergedPayload = {
        ...existingPoint.payload,
        ...updatedPayload,
        chunk: {
          ...existingPoint.payload.chunk,
          ...updatedPayload.chunk,
        },
        editor: updatedPayload.editor,
      };

      await this.qdrantClient.upsertPoints(collectionName, [
        {
          id: chunkId,
          vector: embedding,
          payload: mergedPayload as unknown as Record<string, unknown>,
        },
      ]);
    } else {
      // Partial payload update (no embedding change)
      await this.qdrantClient.updatePayloads(collectionName, [
        {
          id: chunkId,
          payload: {
            'chunk.text': newContent,
            'chunk.type': dto.chunkType ?? existingChunk.chunk.type,
            'chunk.heading_path':
              dto.headingPath ?? existingChunk.chunk.heading_path,
            tags: dto.tags ?? existingChunk.tags,
            editor: updatedPayload.editor,
          },
        },
      ]);
    }

    const duration = Date.now() - startTime;
    this.logger.log({
      event: 'chunk_updated',
      collectionId,
      chunkId,
      userId,
      contentChanged,
      durationMs: duration,
    });

    return this.getChunk(collectionId, chunkId);
  }

  /**
   * Delete a chunk from a collection
   */
  async deleteChunk(
    collectionId: string,
    chunkId: string,
    userId: string,
  ): Promise<void> {
    const collectionName = this.getCollectionName(collectionId);

    // Verify chunk exists
    await this.getChunk(collectionId, chunkId);

    // Delete from Qdrant
    await this.qdrantClient.deletePoints(collectionName, [chunkId]);

    this.logger.log({
      event: 'chunk_deleted',
      collectionId,
      chunkId,
      userId,
    });
  }

  /**
   * Split a chunk into multiple parts
   */
  async splitChunk(
    collectionId: string,
    chunkId: string,
    dto: EditorSplitChunkInput,
    userId: string,
  ): Promise<EditorChunkListResponse> {
    const collectionName = this.getCollectionName(collectionId);
    const startTime = Date.now();

    // Get existing chunk
    const existingChunk = await this.getChunk(collectionId, chunkId);
    const originalPosition = existingChunk.editor?.position ?? 0;

    // Determine split texts
    let splitTexts: string[] = [];

    if (dto.newTextBlocks && dto.newTextBlocks.length > 0) {
      splitTexts = dto.newTextBlocks;
    } else if (dto.splitPoints && dto.splitPoints.length > 0) {
      const text = existingChunk.content;
      const points = [
        0,
        ...dto.splitPoints.sort((a, b) => a - b),
        text.length,
      ];

      for (let i = 0; i < points.length - 1; i++) {
        const sliceText = text.slice(points[i], points[i + 1]).trim();
        if (sliceText) {
          splitTexts.push(sliceText);
        }
      }
    }

    if (splitTexts.length < 2) {
      throw new BadRequestException(
        'Split must result in at least 2 non-empty chunks',
      );
    }

    // Generate embeddings for all new chunks
    const embeddings = await this.llmService.generateEmbeddings(
      splitTexts,
      `split_chunk_${chunkId}`,
    );

    // Create new chunks
    const newChunks: Array<{
      id: string;
      vector: number[];
      payload: Record<string, unknown>;
    }> = [];

    for (let i = 0; i < splitTexts.length; i++) {
      const newChunkId = uuidv4();
      const contentHash = this.computeContentHash(splitTexts[i]);

      const payload: QdrantPayload = {
        doc: {
          source_type: 'manual',
          source_id: `editor_${collectionId}`,
          url: `manual://editor/${collectionId}/${newChunkId}`,
          space_key: null,
          title: null,
          revision: 1,
          last_modified_at: new Date().toISOString(),
          last_modified_by: userId,
        },
        chunk: {
          id: newChunkId,
          index: originalPosition + i,
          type: existingChunk.chunk.type,
          heading_path: existingChunk.chunk.heading_path,
          section: existingChunk.chunk.section,
          text: splitTexts[i],
          content_hash: contentHash,
          lang: this.detectLanguage(splitTexts[i]),
        },
        tags: existingChunk.tags,
        acl: createDefaultAcl(),
        editor: createDefaultEditorMetadata(originalPosition + i, userId),
      };

      newChunks.push({
        id: newChunkId,
        vector: embeddings[i],
        payload: payload as unknown as Record<string, unknown>,
      });
    }

    // Delete original chunk
    await this.qdrantClient.deletePoints(collectionName, [chunkId]);

    // Insert new chunks
    await this.qdrantClient.upsertPoints(collectionName, newChunks);

    const duration = Date.now() - startTime;
    this.logger.log({
      event: 'chunk_split',
      collectionId,
      originalChunkId: chunkId,
      newChunkCount: newChunks.length,
      userId,
      durationMs: duration,
    });

    // Return new chunks
    return {
      chunks: newChunks.map((c) =>
        this.mapPointToChunkResponse({
          id: c.id,
          payload: c.payload as unknown as QdrantPayload,
        }),
      ),
      total: newChunks.length,
      limit: newChunks.length,
      offset: 0,
    };
  }

  /**
   * Merge multiple chunks into one
   */
  async mergeChunks(
    collectionId: string,
    dto: EditorMergeChunksInput,
    userId: string,
  ): Promise<EditorChunkResponse> {
    const collectionName = this.getCollectionName(collectionId);
    const startTime = Date.now();

    // Get all chunks to merge
    const chunksToMerge: EditorChunkResponse[] = [];
    for (const id of dto.chunkIds) {
      chunksToMerge.push(await this.getChunk(collectionId, id));
    }

    // Sort by position to maintain order
    chunksToMerge.sort(
      (a, b) => (a.editor?.position ?? 0) - (b.editor?.position ?? 0),
    );

    // Merge content
    const mergedContent = chunksToMerge
      .map((c) => c.content)
      .join(dto.separator);

    // Generate embedding for merged content
    const [embedding] = await this.llmService.generateEmbeddings(
      [mergedContent],
      `merge_chunks_${collectionId}`,
    );

    // Create merged chunk
    const mergedChunkId = uuidv4();
    const contentHash = this.computeContentHash(mergedContent);
    const firstChunk = chunksToMerge[0];

    const payload: QdrantPayload = {
      doc: {
        source_type: 'manual',
        source_id: `editor_${collectionId}`,
        url: `manual://editor/${collectionId}/${mergedChunkId}`,
        space_key: null,
        title: null,
        revision: 1,
        last_modified_at: new Date().toISOString(),
        last_modified_by: userId,
      },
      chunk: {
        id: mergedChunkId,
        index: firstChunk.editor?.position ?? 0,
        type: firstChunk.chunk.type,
        heading_path: firstChunk.chunk.heading_path,
        section: firstChunk.chunk.section,
        text: mergedContent,
        content_hash: contentHash,
        lang: this.detectLanguage(mergedContent),
      },
      tags: [...new Set(chunksToMerge.flatMap((c) => c.tags))],
      acl: createDefaultAcl(),
      editor: createDefaultEditorMetadata(
        firstChunk.editor?.position ?? 0,
        userId,
      ),
    };

    // Delete original chunks
    await this.qdrantClient.deletePoints(collectionName, dto.chunkIds);

    // Insert merged chunk
    await this.qdrantClient.upsertPoints(collectionName, [
      {
        id: mergedChunkId,
        vector: embedding,
        payload: payload as unknown as Record<string, unknown>,
      },
    ]);

    const duration = Date.now() - startTime;
    this.logger.log({
      event: 'chunks_merged',
      collectionId,
      mergedChunkIds: dto.chunkIds,
      newChunkId: mergedChunkId,
      userId,
      durationMs: duration,
    });

    return this.mapPointToChunkResponse({
      id: mergedChunkId,
      payload,
    });
  }

  /**
   * Reorder chunks within a collection
   */
  async reorderChunks(
    collectionId: string,
    dto: ReorderChunksInput,
    userId: string,
  ): Promise<void> {
    const collectionName = this.getCollectionName(collectionId);
    const startTime = Date.now();

    // Verify all chunks exist
    for (const pos of dto.chunkPositions) {
      await this.getChunk(collectionId, pos.chunkId);
    }

    // Update positions
    const updates = dto.chunkPositions.map((pos) => ({
      id: pos.chunkId,
      payload: {
        'editor.position': pos.position,
        'editor.last_edited_at': new Date().toISOString(),
        'editor.last_edited_by': userId,
      },
    }));

    await this.qdrantClient.updatePayloads(collectionName, updates);

    const duration = Date.now() - startTime;
    this.logger.log({
      event: 'chunks_reordered',
      collectionId,
      chunkCount: dto.chunkPositions.length,
      userId,
      durationMs: duration,
    });
  }

  /**
   * Update quality score for a chunk
   */
  async updateQualityScore(
    collectionId: string,
    chunkId: string,
    dto: UpdateQualityScoreInput,
    userId: string,
  ): Promise<EditorChunkResponse> {
    const collectionName = this.getCollectionName(collectionId);

    // Verify chunk exists
    await this.getChunk(collectionId, chunkId);

    // Update quality fields
    await this.qdrantClient.updatePayloads(collectionName, [
      {
        id: chunkId,
        payload: {
          'editor.quality_score': dto.score,
          'editor.quality_issues': dto.issues,
          'editor.last_edited_at': new Date().toISOString(),
          'editor.last_edited_by': userId,
        },
      },
    ]);

    this.logger.log({
      event: 'chunk_quality_updated',
      collectionId,
      chunkId,
      score: dto.score,
      issueCount: dto.issues.length,
      userId,
    });

    return this.getChunk(collectionId, chunkId);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private mapPointToChunkResponse(point: QdrantPoint): EditorChunkResponse {
    const payload = point.payload;

    return {
      id: point.id,
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
      editor: payload.editor,
    };
  }

  private computeContentHash(content: string): string {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return `sha256:${hash}`;
  }

  private detectLanguage(text: string): 'en' | 'ru' | 'mixed' {
    // Simple heuristic: count Cyrillic vs Latin characters
    const cyrillicCount = (text.match(/[а-яА-ЯёЁ]/g) || []).length;
    const latinCount = (text.match(/[a-zA-Z]/g) || []).length;

    if (cyrillicCount > latinCount * 2) return 'ru';
    if (latinCount > cyrillicCount * 2) return 'en';
    return 'mixed';
  }
}
