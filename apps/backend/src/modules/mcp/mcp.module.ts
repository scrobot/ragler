import { Module } from '@nestjs/common';
import { VectorModule } from '../vector/vector.module';
import { CollectionModule } from '../collection/collection.module';
import { IngestModule } from '../ingest/ingest.module';
import { LlmModule } from '../llm/llm.module';
import { QdrantModule } from '@infrastructure/qdrant';
import { McpToolsService } from './mcp-tools.service';
import { McpServerService } from './mcp-server.service';

/**
 * MCP integration module.
 *
 * Provides MCP services for creating MCP Server instances.
 * The actual HTTP listener is bootstrapped in main.ts as a separate
 * raw HTTP server — no NestJS controller needed.
 */
@Module({
  imports: [VectorModule, CollectionModule, IngestModule, LlmModule, QdrantModule],
  providers: [McpToolsService, McpServerService],
  exports: [McpServerService],
})
export class McpModule {}
