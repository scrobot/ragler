#!/usr/bin/env node
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMCPServer } from './server.js';
import { config, TransportType } from './config.js';
import { checkLiveness, checkReadiness } from './health/health.js';

// ---------------------------------------------------------------------------
// stdio
// ---------------------------------------------------------------------------
async function startStdio(): Promise<void> {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('KMS-RAG MCP Server running on stdio');
  console.error('Available tools: search_knowledge, list_collections, get_collection_info');
}

// ---------------------------------------------------------------------------
// streamable-http  (MCP 2025-03-26 spec)
// ---------------------------------------------------------------------------
async function startStreamableHttp(): Promise<void> {
  const server = createMCPServer();

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });

  await server.connect(transport);

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (url.pathname === '/mcp') {
      await transport.handleRequest(req, res);
      return;
    }

    // Health-check endpoints
    if (req.method === 'GET' && (url.pathname === '/health/live' || url.pathname === '/health/liveness')) {
      const result = checkLiveness();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    if (req.method === 'GET' && (url.pathname === '/health/ready' || url.pathname === '/health/readiness' || url.pathname === '/health')) {
      const result = await checkReadiness();
      const statusCode = result.status === 'ok' ? 200 : 503;
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  httpServer.listen(config.port, '0.0.0.0', () => {
    console.error(
      `KMS-RAG MCP Server listening on http://0.0.0.0:${config.port}/mcp (streamable-http)`,
    );
    console.error('Available tools: search_knowledge, list_collections, get_collection_info');
  });

  setupGracefulShutdown(async () => {
    await transport.close();
    httpServer.close();
  });
}

// ---------------------------------------------------------------------------
// sse  (legacy, SDK-deprecated)
// ---------------------------------------------------------------------------
async function startSse(): Promise<void> {
  const server = createMCPServer();

  // SSEServerTransport is created per-connection, so we track active transports
  const activeSseTransports = new Map<string, SSEServerTransport>();

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    // SSE connection endpoint — client GETs this to open the event stream
    if (url.pathname === '/sse' && req.method === 'GET') {
      const transport = new SSEServerTransport('/messages', res);
      activeSseTransports.set(transport.sessionId, transport);

      transport.onclose = () => {
        activeSseTransports.delete(transport.sessionId);
      };

      await server.connect(transport);
      return;
    }

    // Message endpoint — client POSTs JSON-RPC messages here
    if (url.pathname === '/messages' && req.method === 'POST') {
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId) {
        res.writeHead(400);
        res.end('Missing sessionId query parameter');
        return;
      }

      const transport = activeSseTransports.get(sessionId);
      if (!transport) {
        res.writeHead(404);
        res.end('Unknown session');
        return;
      }

      await transport.handlePostMessage(req, res);
      return;
    }

    // Health-check endpoints
    if (req.method === 'GET' && (url.pathname === '/health/live' || url.pathname === '/health/liveness')) {
      const result = checkLiveness();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    if (req.method === 'GET' && (url.pathname === '/health/ready' || url.pathname === '/health/readiness' || url.pathname === '/health')) {
      const result = await checkReadiness();
      const statusCode = result.status === 'ok' ? 200 : 503;
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  httpServer.listen(config.port, '0.0.0.0', () => {
    console.error(
      `KMS-RAG MCP Server listening on http://0.0.0.0:${config.port}/sse (sse)`,
    );
    console.error('Available tools: search_knowledge, list_collections, get_collection_info');
  });

  setupGracefulShutdown(async () => {
    for (const transport of activeSseTransports.values()) {
      await transport.close();
    }
    httpServer.close();
  });
}

// ---------------------------------------------------------------------------
// Graceful shutdown helper
// ---------------------------------------------------------------------------
function setupGracefulShutdown(cleanup: () => Promise<void>): void {
  const shutdown = async (): Promise<void> => {
    console.error('Shutting down MCP server…');
    await cleanup();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const TRANSPORT_STARTERS: Record<TransportType, () => Promise<void>> = {
  'stdio': startStdio,
  'streamable-http': startStreamableHttp,
  'sse': startSse,
};

TRANSPORT_STARTERS[config.transport]().catch((error: unknown) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
