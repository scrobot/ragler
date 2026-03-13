import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import helmet from 'helmet';
import { createServer } from 'http';
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
  const mcpServer = mcpServerService.createServer();

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });
  await mcpServer.connect(transport);

  const mcpHttpServer = createServer(async (req, res) => {
    // CORS headers for cross-origin MCP clients
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/mcp') {
      await transport.handleRequest(req, res);
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
      await transport.close();
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
