import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import helmet from 'helmet';
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters';
import { McpServerService } from './modules/mcp/mcp-server.service';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const SHUTDOWN_TIMEOUT_MS = 30000;

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  // -------------------------------------------------------------------------
  // 1. NestJS backend — REST API on PORT (default 3000)
  // -------------------------------------------------------------------------
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('KMS-RAG API')
    .setDescription('Knowledge Management System for RAG - API Documentation')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'X-User-ID', in: 'header' }, 'X-User-ID')
    .addTag('Collections', 'Knowledge collection management')
    .addTag('Ingest', 'Data ingestion')
    .addTag('Session', 'Draft session operations')
    .addTag('Health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const apiPort = process.env.PORT || 3000;
  await app.listen(apiPort);
  logger.log(`API is running on: http://localhost:${apiPort}`);
  logger.log(`Swagger documentation: http://localhost:${apiPort}/api/docs`);

  // -------------------------------------------------------------------------
  // 2. MCP server — raw HTTP on MCP_PORT (default 3100)
  //    No body parser, no middleware — MCP SDK reads the raw stream directly.
  // -------------------------------------------------------------------------
  const mcpServerService = app.get(McpServerService);

  /** Active transports keyed by session ID. */
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  const mcpHttpServer = createServer(async (req, res) => {
    // CORS headers for cross-origin MCP clients
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Mcp-Session-Id');
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/mcp') {
      try {
        // Check for existing session
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let transport = sessionId ? sessions.get(sessionId) : undefined;

        if (transport) {
          // Existing session — reuse transport
          await transport.handleRequest(req, res);
          return;
        }

        // New session — create fresh transport + server pair
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });

        transport.onclose = () => {
          const sid = (transport as StreamableHTTPServerTransport & { sessionId?: string }).sessionId;
          if (sid) sessions.delete(sid);
          logger.log({ event: 'mcp_session_closed', sessionId: sid });
        };

        const server = mcpServerService.createServer();
        await server.connect(transport);

        await transport.handleRequest(req, res);

        // Store session after successful init
        if ((transport as unknown as { sessionId?: string }).sessionId) {
          sessions.set((transport as unknown as { sessionId: string }).sessionId, transport);
          logger.log({ event: 'mcp_session_opened', sessionId: (transport as unknown as { sessionId: string }).sessionId });
        }
      } catch (error) {
        logger.error({ event: 'mcp_request_error', error: String(error) });
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null }));
        }
      }
      return;
    }

    // Health check for Docker
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found. Use POST /mcp' }));
  });

  const mcpPort = process.env.MCP_PORT || 3100;
  mcpHttpServer.listen(mcpPort, () => {
    logger.log(`MCP server is running on: http://localhost:${mcpPort}/mcp`);
  });

  // -------------------------------------------------------------------------
  // Graceful shutdown for both servers
  // -------------------------------------------------------------------------
  const shutdown = async (signal: string): Promise<void> => {
    logger.log(`Received ${signal}, starting graceful shutdown...`);

    const forceExitTimeout = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    try {
      mcpHttpServer.close();
      for (const [, t] of sessions) {
        await t.close();
      }
      sessions.clear();
      await app.close();
      clearTimeout(forceExitTimeout);
      logger.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      clearTimeout(forceExitTimeout);
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

void bootstrap();
