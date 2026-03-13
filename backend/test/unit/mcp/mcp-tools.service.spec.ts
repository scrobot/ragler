import { McpToolsService } from '@mcp/mcp-tools.service';
import { VectorService } from '@vector/vector.service';
import { CollectionService } from '@collection/collection.service';

describe('McpToolsService', () => {
  let service: McpToolsService;
  let vectorService: jest.Mocked<VectorService>;
  let collectionService: jest.Mocked<CollectionService>;

  beforeEach(() => {
    vectorService = {
      search: jest.fn(),
    } as unknown as jest.Mocked<VectorService>;

    collectionService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<CollectionService>;

    service = new McpToolsService(vectorService, collectionService);
  });

  describe('listTools', () => {
    it('should return all 3 tool definitions', () => {
      const tools = service.listTools();
      expect(tools).toHaveLength(3);

      const names = tools.map((t) => t.name);
      expect(names).toContain('search_knowledge');
      expect(names).toContain('list_collections');
      expect(names).toContain('get_collection_info');
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
  });
});
