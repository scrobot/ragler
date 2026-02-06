import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  searchKnowledgeTool,
  handleSearchKnowledge,
} from './tools/search.js';
import {
  listCollectionsTool,
  getCollectionInfoTool,
  handleListCollections,
  handleGetCollectionInfo,
} from './tools/collections.js';

export function createMCPServer(): Server {
  const server = new Server(
    {
      name: 'kms-rag-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool listing handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        searchKnowledgeTool,
        listCollectionsTool,
        getCollectionInfoTool,
      ],
    };
  });

  // Register tool execution handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'search_knowledge':
        return await handleSearchKnowledge(args);

      case 'list_collections':
        return await handleListCollections();

      case 'get_collection_info':
        return await handleGetCollectionInfo(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}
