import { Module, forwardRef } from '@nestjs/common';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { ChunkController, CollectionReorderController } from './chunk.controller';
import { ChunkService } from './chunk.service';
import { CollectionAgentService } from './agent/collection-agent.service';
import { CollectionAgentController } from './agent/collection-agent.controller';
import { AgentMemoryService } from './agent/memory/redis-memory';
import { ChatService } from './chat/chat.service';
import { ChatController } from './chat/chat.controller';
import { LlmModule } from '@llm/llm.module';

@Module({
  imports: [forwardRef(() => LlmModule)],
  controllers: [
    CollectionController,
    ChunkController,
    CollectionReorderController,
    CollectionAgentController,
    ChatController,
  ],
  providers: [
    CollectionService,
    ChunkService,
    CollectionAgentService,
    AgentMemoryService,
    ChatService,
  ],
  exports: [CollectionService, ChunkService, CollectionAgentService],
})
export class CollectionModule { }

