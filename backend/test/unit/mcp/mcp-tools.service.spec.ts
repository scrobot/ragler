import { McpToolsService } from '@mcp/mcp-tools.service';
import { VectorService } from '@vector/vector.service';
import { CollectionService } from '@collection/collection.service';
import { IngestService } from '@ingest/ingest.service';
import { LlmService } from '@llm/llm.service';
import { QdrantClientService } from '@infrastructure/qdrant';

describe('McpToolsService', () => {
  let service: McpToolsService;
  let vectorService: jest.Mocked<VectorService>;
  let collectionService: jest.Mocked<CollectionService>;
  let ingestService: jest.Mocked<IngestService>;
  let llmService: jest.Mocked<LlmService>;
  let qdrantClient: jest.Mocked<QdrantClientService>;

  beforeEach(() => {
    vectorService = {
      search: jest.fn(),
    } as unknown as jest.Mocked<VectorService>;

    collectionService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<CollectionService>;

    ingestService = {
      ingestWeb: jest.fn(),
      ingestManual: jest.fn(),
      ingestFile: jest.fn(),
    } as unknown as jest.Mocked<IngestService>;

    llmService = {
      generateEmbeddings: jest.fn(),
    } as unknown as jest.Mocked<LlmService>;

    qdrantClient = {
      collectionExists: jest.fn(),
      upsertPoints: jest.fn(),
      deletePointsByFilter: jest.fn(),
    } as unknown as jest.Mocked<QdrantClientService>;

    service = new McpToolsService(
      vectorService,
      collectionService,
      ingestService,
      llmService,
      qdrantClient,
    );
  });

  describe('listTools', () => {
    it('should return all 5 tool definitions', () => {
      const tools = service.listTools();
      expect(tools).toHaveLength(5);

      const names = tools.map((t) => t.name);
      expect(names).toContain('search_knowledge');
      expect(names).toContain('list_collections');
      expect(names).toContain('get_collection_info');
      expect(names).toContain('insert_chunks');
      expect(names).toContain('ingest_material');
    });
  });

  describe('callTool', () => {
    it('should throw on unknown tool name', async () => {
      await expect(service.callTool('nonexistent', {})).rejects.toThrow('Unknown tool: nonexistent');
    });

    describe('search_knowledge', () => {
      it('should return formatted search results', async () => {
        vectorService.search.mockResolvedValue({
          results: [
            {
              id: 'chunk-1',
              score: 0.95,
              content: 'Test content about NestJS',
              doc: {
                url: 'https://example.com/page',
                title: 'NestJS Guide',
                source_type: 'web',
                revision: 1,
              },
              chunk: {
                type: 'knowledge',
                heading_path: ['Getting Started', 'Installation'],
                section: 'install',
                lang: 'en',
              },
              tags: ['nestjs', 'tutorial'],
            },
          ],
          total: 1,
          query: 'how to install nestjs',
        });

        const result = await service.callTool('search_knowledge', {
          query: 'how to install nestjs',
          collection_id: '00000000-0000-0000-0000-000000000001',
          limit: 5,
        });

        expect(result.isError).toBeUndefined();
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('how to install nestjs');
        expect(result.content[0].text).toContain('NestJS Guide');
        expect(result.content[0].text).toContain('0.950');

        expect(vectorService.search).toHaveBeenCalledWith({
          query: 'how to install nestjs',
          collectionId: '00000000-0000-0000-0000-000000000001',
          limit: 5,
          filters: undefined,
        });
      });

      it('should return error on validation failure', async () => {
        const result = await service.callTool('search_knowledge', { query: '' });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error searching knowledge');
      });

      it('should return error when service throws', async () => {
        vectorService.search.mockRejectedValue(new Error('Qdrant unavailable'));

        const result = await service.callTool('search_knowledge', {
          query: 'test',
          collection_id: '00000000-0000-0000-0000-000000000001',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Qdrant unavailable');
      });
    });

    describe('list_collections', () => {
      it('should return collections as JSON', async () => {
        const collections = {
          collections: [
            {
              id: '00000000-0000-0000-0000-000000000001',
              name: 'Test KB',
              description: 'A test knowledge base',
              createdBy: 'user-1',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          total: 1,
        };
        collectionService.findAll.mockResolvedValue(collections);

        const result = await service.callTool('list_collections', {});

        expect(result.isError).toBeUndefined();
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.total).toBe(1);
        expect(parsed.collections[0].name).toBe('Test KB');
      });
    });

    describe('get_collection_info', () => {
      it('should return collection details as JSON', async () => {
        const collection = {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Test KB',
          description: 'A test knowledge base',
          createdBy: 'user-1',
          createdAt: '2026-01-01T00:00:00.000Z',
        };
        collectionService.findOne.mockResolvedValue(collection);

        const result = await service.callTool('get_collection_info', {
          collection_id: '00000000-0000-0000-0000-000000000001',
        });

        expect(result.isError).toBeUndefined();
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.name).toBe('Test KB');
      });

      it('should return error on invalid collection_id', async () => {
        const result = await service.callTool('get_collection_info', {
          collection_id: 'not-a-uuid',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error getting collection info');
      });
    });

    // -----------------------------------------------------------------------
    // insert_chunks
    // -----------------------------------------------------------------------
    describe('insert_chunks', () => {
      const validArgs = {
        collection_id: '00000000-0000-0000-0000-000000000001',
        source: {
          url: 'https://example.com/doc',
          title: 'Test Document',
          source_type: 'web',
        },
        chunks: [
          { text: 'First chunk content' },
          { text: 'Second chunk content', type: 'faq', tags: ['testing'] },
        ],
        user_id: 'agent-007',
      };

      it('should insert chunks with atomic replacement', async () => {
        qdrantClient.collectionExists.mockResolvedValue(true);
        llmService.generateEmbeddings.mockResolvedValue([
          [0.1, 0.2, 0.3],
          [0.4, 0.5, 0.6],
        ]);
        qdrantClient.deletePointsByFilter.mockResolvedValue(undefined);
        qdrantClient.upsertPoints.mockResolvedValue(undefined);

        const result = await service.callTool('insert_chunks', validArgs);

        expect(result.isError).toBeUndefined();
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.success).toBe(true);
        expect(parsed.inserted_chunks).toBe(2);
        expect(parsed.collection_id).toBe('00000000-0000-0000-0000-000000000001');

        // Verify atomic replacement: delete before upsert
        expect(qdrantClient.deletePointsByFilter).toHaveBeenCalledWith(
          'kb_00000000-0000-0000-0000-000000000001',
          expect.objectContaining({
            must: [{ key: 'doc.source_id', match: { value: expect.any(String) } }],
          }),
        );

        expect(qdrantClient.upsertPoints).toHaveBeenCalledWith(
          'kb_00000000-0000-0000-0000-000000000001',
          expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              vector: [0.1, 0.2, 0.3],
              payload: expect.objectContaining({
                doc: expect.objectContaining({
                  source_type: 'web',
                  url: 'https://example.com/doc',
                  title: 'Test Document',
                }),
                chunk: expect.objectContaining({
                  text: 'First chunk content',
                  type: 'knowledge',
                }),
              }),
            }),
          ]),
        );

        // Verify embeddings called with chunk texts
        expect(llmService.generateEmbeddings).toHaveBeenCalledWith([
          'First chunk content',
          'Second chunk content',
        ]);
      });

      it('should return error when collection does not exist', async () => {
        qdrantClient.collectionExists.mockResolvedValue(false);

        const result = await service.callTool('insert_chunks', validArgs);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Collection');
        expect(result.content[0].text).toContain('not found');
      });

      it('should return error on validation failure — missing chunks', async () => {
        const result = await service.callTool('insert_chunks', {
          collection_id: '00000000-0000-0000-0000-000000000001',
          source: { url: 'https://example.com', source_type: 'web' },
          chunks: [],
          user_id: 'agent',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error inserting chunks');
      });

      it('should return error on validation failure — missing user_id', async () => {
        const result = await service.callTool('insert_chunks', {
          collection_id: '00000000-0000-0000-0000-000000000001',
          source: { url: 'https://example.com', source_type: 'web' },
          chunks: [{ text: 'content' }],
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error inserting chunks');
      });

      it('should return error when embedding generation fails', async () => {
        qdrantClient.collectionExists.mockResolvedValue(true);
        llmService.generateEmbeddings.mockRejectedValue(new Error('OpenAI rate limit'));

        const result = await service.callTool('insert_chunks', validArgs);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('OpenAI rate limit');
      });

      it('should preserve custom chunk type and tags', async () => {
        qdrantClient.collectionExists.mockResolvedValue(true);
        llmService.generateEmbeddings.mockResolvedValue([[0.1]]);
        qdrantClient.deletePointsByFilter.mockResolvedValue(undefined);
        qdrantClient.upsertPoints.mockResolvedValue(undefined);

        await service.callTool('insert_chunks', {
          collection_id: '00000000-0000-0000-0000-000000000001',
          source: { url: 'https://example.com', source_type: 'manual' },
          chunks: [
            {
              text: 'FAQ content',
              type: 'faq',
              heading_path: ['Section 1', 'FAQ'],
              tags: ['faq', 'help'],
            },
          ],
          user_id: 'agent',
        });

        expect(qdrantClient.upsertPoints).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([
            expect.objectContaining({
              payload: expect.objectContaining({
                chunk: expect.objectContaining({
                  type: 'faq',
                  heading_path: ['Section 1', 'FAQ'],
                }),
                tags: ['faq', 'help'],
              }),
            }),
          ]),
        );
      });
    });

    // -----------------------------------------------------------------------
    // ingest_material
    // -----------------------------------------------------------------------
    describe('ingest_material', () => {
      const sessionResult = {
        sessionId: 'session_abc-123',
        sourceType: 'web' as const,
        sourceUrl: 'https://example.com/page',
        status: 'DRAFT',
        createdAt: '2026-03-14T12:00:00.000Z',
      };

      it('should ingest web material', async () => {
        ingestService.ingestWeb.mockResolvedValue(sessionResult);

        const result = await service.callTool('ingest_material', {
          source_type: 'web',
          url: 'https://example.com/page',
          user_id: 'agent-web',
        });

        expect(result.isError).toBeUndefined();
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.success).toBe(true);
        expect(parsed.session_id).toBe('session_abc-123');
        expect(parsed.source_type).toBe('web');
        expect(parsed.message).toContain('review');

        expect(ingestService.ingestWeb).toHaveBeenCalledWith(
          { url: 'https://example.com/page', chunkingConfig: undefined },
          'agent-web',
        );
      });

      it('should ingest manual text material', async () => {
        const manualResult = { ...sessionResult, sourceType: 'manual' as const };
        ingestService.ingestManual.mockResolvedValue(manualResult);

        const result = await service.callTool('ingest_material', {
          source_type: 'manual',
          content: 'This is test manual content for knowledge base.',
          user_id: 'agent-manual',
        });

        expect(result.isError).toBeUndefined();
        expect(ingestService.ingestManual).toHaveBeenCalledWith(
          expect.objectContaining({ content: 'This is test manual content for knowledge base.' }),
          'agent-manual',
        );
      });

      it('should ingest file material from base64', async () => {
        const fileResult = { ...sessionResult, sourceType: 'file' as const };
        ingestService.ingestFile.mockResolvedValue(fileResult);

        const fileContent = Buffer.from('Hello, world!').toString('base64');
        const result = await service.callTool('ingest_material', {
          source_type: 'file',
          file_base64: fileContent,
          filename: 'test.txt',
          user_id: 'agent-file',
        });

        expect(result.isError).toBeUndefined();
        expect(ingestService.ingestFile).toHaveBeenCalledWith(
          expect.objectContaining({
            originalname: 'test.txt',
            mimetype: 'text/plain',
          }),
          'agent-file',
          undefined,
        );
      });

      it('should pass chunking config when provided', async () => {
        ingestService.ingestWeb.mockResolvedValue(sessionResult);

        await service.callTool('ingest_material', {
          source_type: 'web',
          url: 'https://example.com',
          user_id: 'agent',
          chunking_config: {
            method: 'character',
            chunk_size: 500,
            overlap: 100,
          },
        });

        expect(ingestService.ingestWeb).toHaveBeenCalledWith(
          {
            url: 'https://example.com',
            chunkingConfig: { method: 'character', chunkSize: 500, overlap: 100 },
          },
          'agent',
        );
      });

      it('should return error when web source_type missing url', async () => {
        const result = await service.callTool('ingest_material', {
          source_type: 'web',
          user_id: 'agent',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error ingesting material');
      });

      it('should return error when manual source_type missing content', async () => {
        const result = await service.callTool('ingest_material', {
          source_type: 'manual',
          user_id: 'agent',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error ingesting material');
      });

      it('should return error when file source_type missing file_base64', async () => {
        const result = await service.callTool('ingest_material', {
          source_type: 'file',
          filename: 'test.txt',
          user_id: 'agent',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error ingesting material');
      });

      it('should return error when file source_type missing filename', async () => {
        const result = await service.callTool('ingest_material', {
          source_type: 'file',
          file_base64: 'dGVzdA==',
          user_id: 'agent',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error ingesting material');
      });

      it('should return error when ingest service throws', async () => {
        ingestService.ingestWeb.mockRejectedValue(new Error('Failed to fetch URL'));

        const result = await service.callTool('ingest_material', {
          source_type: 'web',
          url: 'https://example.com/broken',
          user_id: 'agent',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Failed to fetch URL');
      });
    });
  });
});
