import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ChunkService } from '@collection/chunk.service';
import { CollectionService } from '@collection/collection.service';
import { QdrantClientService } from '@infrastructure/qdrant';
import { LlmService } from '@llm/llm.service';
import type { QdrantPayload } from '@modules/vector/dto/payload.dto';

describe('ChunkService - listDocuments', () => {
    let service: ChunkService;
    let mockQdrantClient: jest.Mocked<
        Pick<QdrantClientService, 'collectionExists' | 'scroll'>
    >;
    let mockLlmService: jest.Mocked<Pick<LlmService, 'generateEmbeddings'>>;
    let mockCollectionService: jest.Mocked<Pick<CollectionService, 'findOne'>>;

    const validCollectionId = '550e8400-e29b-41d4-a716-446655440000';

    const createMockPoint = (overrides: {
        sourceId: string;
        sourceType?: string;
        url?: string;
        title?: string | null;
        filename?: string | null;
        mimeType?: string | null;
        qualityScore?: number | null;
        lastModifiedAt?: string;
        ingestDate?: string | null;
    }): { id: string; payload: QdrantPayload } => ({
        id: `chunk-${Math.random().toString(36).slice(2, 8)}`,
        payload: {
            doc: {
                source_type: (overrides.sourceType as any) || 'web',
                source_id: overrides.sourceId,
                url: overrides.url || 'https://example.com/test',
                space_key: null,
                title: overrides.title ?? 'Test Document',
                revision: 1,
                last_modified_at: overrides.lastModifiedAt || '2025-01-01T00:00:00.000Z',
                last_modified_by: 'user-1',
                filename: overrides.filename ?? null,
                file_size: null,
                mime_type: overrides.mimeType ?? null,
                ingest_date: overrides.ingestDate ?? '2025-01-01T00:00:00.000Z',
            },
            chunk: {
                id: `chunk-${Math.random().toString(36).slice(2, 8)}`,
                index: 0,
                type: 'knowledge',
                heading_path: [],
                section: null,
                text: 'Test content',
                content_hash: 'sha256:abc123',
                lang: 'en',
            },
            tags: [],
            acl: {
                visibility: 'internal',
                allowed_groups: [],
                allowed_users: [],
            },
            editor: {
                position: 0,
                quality_score: overrides.qualityScore ?? null,
                quality_issues: [],
                last_edited_at: '2025-01-01T00:00:00.000Z',
                last_edited_by: 'user-1',
                edit_count: 0,
            },
        },
    });

    beforeEach(async () => {
        mockQdrantClient = {
            collectionExists: jest.fn().mockResolvedValue(true),
            scroll: jest.fn().mockResolvedValue([]),
        };

        mockLlmService = {
            generateEmbeddings: jest.fn(),
        };

        mockCollectionService = {
            findOne: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChunkService,
                { provide: QdrantClientService, useValue: mockQdrantClient },
                { provide: LlmService, useValue: mockLlmService },
                { provide: CollectionService, useValue: mockCollectionService },
            ],
        }).compile();

        service = module.get<ChunkService>(ChunkService);
    });

    it('should throw NotFoundException when collection does not exist', async () => {
        mockQdrantClient.collectionExists.mockResolvedValue(false);

        await expect(service.listDocuments(validCollectionId)).rejects.toThrow(
            NotFoundException,
        );
    });

    it('should return empty array for empty collection', async () => {
        mockQdrantClient.scroll.mockResolvedValue([]);

        const result = await service.listDocuments(validCollectionId);

        expect(result.documents).toEqual([]);
        expect(result.total).toBe(0);
    });

    it('should group chunks by doc.source_id', async () => {
        mockQdrantClient.scroll.mockResolvedValue([
            createMockPoint({ sourceId: 'doc-1', title: 'Doc One' }),
            createMockPoint({ sourceId: 'doc-1', title: 'Doc One' }),
            createMockPoint({ sourceId: 'doc-2', title: 'Doc Two' }),
        ]);

        const result = await service.listDocuments(validCollectionId);

        expect(result.documents).toHaveLength(2);
        expect(result.total).toBe(2);

        const doc1 = result.documents.find((d) => d.sourceId === 'doc-1');
        const doc2 = result.documents.find((d) => d.sourceId === 'doc-2');

        expect(doc1?.chunkCount).toBe(2);
        expect(doc2?.chunkCount).toBe(1);
    });

    it('should compute average quality score from chunks with scores', async () => {
        mockQdrantClient.scroll.mockResolvedValue([
            createMockPoint({ sourceId: 'doc-1', qualityScore: 80 }),
            createMockPoint({ sourceId: 'doc-1', qualityScore: 60 }),
            createMockPoint({ sourceId: 'doc-1', qualityScore: null }),
        ]);

        const result = await service.listDocuments(validCollectionId);

        expect(result.documents[0].avgQualityScore).toBe(70);
    });

    it('should return null avgQualityScore when no chunks have scores', async () => {
        mockQdrantClient.scroll.mockResolvedValue([
            createMockPoint({ sourceId: 'doc-1', qualityScore: null }),
            createMockPoint({ sourceId: 'doc-1', qualityScore: null }),
        ]);

        const result = await service.listDocuments(validCollectionId);

        expect(result.documents[0].avgQualityScore).toBeNull();
    });

    it('should preserve filename and mimeType from doc metadata', async () => {
        mockQdrantClient.scroll.mockResolvedValue([
            createMockPoint({
                sourceId: 'doc-1',
                sourceType: 'file',
                filename: 'report.pdf',
                mimeType: 'application/pdf',
            }),
        ]);

        const result = await service.listDocuments(validCollectionId);

        expect(result.documents[0].filename).toBe('report.pdf');
        expect(result.documents[0].mimeType).toBe('application/pdf');
        expect(result.documents[0].sourceType).toBe('file');
    });

    it('should sort documents by lastModifiedAt descending', async () => {
        mockQdrantClient.scroll.mockResolvedValue([
            createMockPoint({
                sourceId: 'old-doc',
                lastModifiedAt: '2024-01-01T00:00:00.000Z',
            }),
            createMockPoint({
                sourceId: 'new-doc',
                lastModifiedAt: '2025-06-15T00:00:00.000Z',
            }),
        ]);

        const result = await service.listDocuments(validCollectionId);

        expect(result.documents[0].sourceId).toBe('new-doc');
        expect(result.documents[1].sourceId).toBe('old-doc');
    });

    it('should track latest lastModifiedAt across chunks of same document', async () => {
        mockQdrantClient.scroll.mockResolvedValue([
            createMockPoint({
                sourceId: 'doc-1',
                lastModifiedAt: '2024-01-01T00:00:00.000Z',
            }),
            createMockPoint({
                sourceId: 'doc-1',
                lastModifiedAt: '2025-06-15T00:00:00.000Z',
            }),
        ]);

        const result = await service.listDocuments(validCollectionId);

        expect(result.documents[0].lastModifiedAt).toBe('2025-06-15T00:00:00.000Z');
    });

    it('should handle multiple source types in same collection', async () => {
        mockQdrantClient.scroll.mockResolvedValue([
            createMockPoint({ sourceId: 'web-1', sourceType: 'web', title: 'Web Page' }),
            createMockPoint({ sourceId: 'file-1', sourceType: 'file', title: 'Uploaded File' }),
            createMockPoint({ sourceId: 'manual-1', sourceType: 'manual', title: null }),
        ]);

        const result = await service.listDocuments(validCollectionId);

        expect(result.documents).toHaveLength(3);
        const sourceTypes = result.documents.map((d) => d.sourceType).sort();
        expect(sourceTypes).toEqual(['file', 'manual', 'web']);
    });
});
