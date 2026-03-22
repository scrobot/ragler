import {
  Controller,
  All,
  Get,
  Post,
  Req,
  Res,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { Request, Response } from 'express';
import { McpServerService } from './mcp-server.service';

/**
 * Exposes MCP protocol endpoints on the NestJS backend.
 *
 * - POST/GET/DELETE /mcp  → streamable-http transport
 * - GET  /sse              → legacy SSE transport
 * - POST /messages         → legacy SSE message endpoint
 */
@ApiExcludeController()
@SkipThrottle()
@Controller()
export class McpController {
  private readonly logger = new Logger(McpController.name);

  /** Stateless streamable-http transport (shared across requests). */
  private streamableTransport: StreamableHTTPServerTransport | null = null;

  /** Active SSE sessions keyed by sessionId. */
  private readonly activeSseSessions = new Map<string, SSEServerTransport>();

  constructor(private readonly mcpServerService: McpServerService) {}

  // -------------------------------------------------------------------------
  // Streamable HTTP (MCP 2025-03-26 spec)
  // -------------------------------------------------------------------------

  @All('mcp')
  async handleStreamableHttp(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.streamableTransport) {
      await this.initStreamableTransport();
    }
    await this.streamableTransport!.handleRequest(req, res);
  }

  // -------------------------------------------------------------------------
  // Legacy SSE transport
  // -------------------------------------------------------------------------

  @Get('sse')
  async handleSseConnect(
    @Req() _req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const server = this.mcpServerService.createServer();
    const transport = new SSEServerTransport('/messages', res);

    this.activeSseSessions.set(transport.sessionId, transport);
    this.logger.log({ event: 'sse_session_opened', sessionId: transport.sessionId });

    transport.onclose = () => {
      this.activeSseSessions.delete(transport.sessionId);
      this.logger.log({ event: 'sse_session_closed', sessionId: transport.sessionId });
    };

    await server.connect(transport);
  }

  @Post('messages')
  async handleSseMessage(
    @Query('sessionId') sessionId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId query parameter' });
      return;
    }

    const transport = this.activeSseSessions.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: 'Unknown session' });
      return;
    }

    await transport.handlePostMessage(req, res);
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private async initStreamableTransport(): Promise<void> {
    const server = this.mcpServerService.createServer();
    this.streamableTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });
    await server.connect(this.streamableTransport);
    this.logger.log('Streamable-HTTP MCP transport initialised');
  }
}
