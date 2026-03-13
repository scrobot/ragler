import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { McpToolsService } from './mcp-tools.service';

/**
 * Creates and manages the MCP SDK `Server` instance.
 * Tool requests are delegated to McpToolsService.
 */
@Injectable()
export class McpServerService implements OnModuleDestroy {
  private readonly logger = new Logger(McpServerService.name);
  private server: Server | null = null;

  constructor(private readonly mcpToolsService: McpToolsService) {}

  /** Factory — creates a fresh MCP Server wired to tool handlers. */
  createServer(): Server {
    const server = new Server(
      { name: 'ragler-mcp', version: '1.1.0' },
      { capabilities: { tools: {} } },
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.mcpToolsService.listTools(),
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
      const { name, arguments: args } = request.params;
      return this.mcpToolsService.callTool(name, args);
    });

    this.server = server;
    this.logger.log('MCP server instance created');

    return server;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.server) {
      await this.server.close();
      this.logger.log('MCP server closed');
    }
  }
}
