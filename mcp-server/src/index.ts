#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from './server.js';

async function main() {
  // Create MCP server instance
  const server = createMCPServer();

  // Create stdio transport
  const transport = new StdioServerTransport();

  // Connect server to transport
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP protocol)
  console.error('KMS-RAG MCP Server running on stdio');
  console.error('Server capabilities: tools');
  console.error('Available tools: search_knowledge, list_collections, get_collection_info');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
