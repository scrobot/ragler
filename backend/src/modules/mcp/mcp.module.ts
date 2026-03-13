import { Module } from '@nestjs/common';
import { VectorModule } from '@vector/vector.module';
import { CollectionModule } from '@collection/collection.module';
import { McpToolsService } from './mcp-tools.service';
import { McpServerService } from './mcp-server.service';
import { McpController } from './mcp.controller';

@Module({
  imports: [VectorModule, CollectionModule],
  controllers: [McpController],
  providers: [McpToolsService, McpServerService],
  exports: [McpServerService],
})
export class McpModule {}
