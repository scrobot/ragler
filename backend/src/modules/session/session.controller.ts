import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { SessionService } from './session.service';
import { CollectionAgentService } from '@collection/agent/collection-agent.service';
import {
  SessionResponseDto,
  SessionListResponseDto,
  MergeChunksDto,
  SplitChunkDto,
  UpdateChunkDto,
  PublishDto,
  PreviewResponseDto,
  PublishResponseDto,
  DeleteSessionResponseDto,
} from './dto';
import { User, RequestUser } from '@common/decorators';
import { ErrorResponseDto } from '@common/dto';

@ApiTags('Session')
@ApiHeader({ name: 'X-User-ID', required: true, description: 'User identifier' })
@Controller('session')
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly agentService: CollectionAgentService,
  ) { }

  @Get()
  @ApiOperation({ summary: 'List all sessions' })
  @ApiResponse({ status: 200, description: 'List of sessions', type: SessionListResponseDto })
  async listSessions(): Promise<SessionListResponseDto> {
    return this.sessionService.listSessions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session details' })
  @ApiResponse({ status: 200, description: 'Session details', type: SessionResponseDto })
  @ApiResponse({ status: 404, description: 'Session not found', type: ErrorResponseDto })
  async getSession(@Param('id') id: string): Promise<SessionResponseDto> {
    return this.sessionService.getSession(id);
  }

  @Post(':id/chunks')
  @ApiOperation({ summary: 'Generate chunks from session content using LLM' })
  @ApiResponse({ status: 200, description: 'Chunks generated', type: SessionResponseDto })
  @ApiResponse({ status: 400, description: 'Session not in DRAFT status or no content', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Session not found', type: ErrorResponseDto })
  async generateChunks(
    @Param('id') id: string,
    @User() user: RequestUser,
  ): Promise<SessionResponseDto> {
    return this.sessionService.generateChunks(id, user.id);
  }

  @Post(':id/chunks/merge')
  @ApiOperation({ summary: 'Merge chunks' })
  @ApiResponse({ status: 200, description: 'Chunks merged', type: SessionResponseDto })
  async mergeChunks(
    @Param('id') id: string,
    @Body() dto: MergeChunksDto,
  ): Promise<SessionResponseDto> {
    return this.sessionService.mergeChunks(id, dto);
  }

  @Post(':id/chunks/:chunkId/split')
  @ApiOperation({ summary: 'Split chunk into multiple chunks' })
  @ApiResponse({ status: 200, description: 'Chunk split', type: SessionResponseDto })
  async splitChunk(
    @Param('id') id: string,
    @Param('chunkId') chunkId: string,
    @Body() dto: SplitChunkDto,
  ): Promise<SessionResponseDto> {
    return this.sessionService.splitChunk(id, chunkId, dto);
  }

  @Patch(':id/chunks/:chunkId')
  @ApiOperation({ summary: 'Update chunk text' })
  @ApiResponse({ status: 200, description: 'Chunk updated', type: SessionResponseDto })
  async updateChunk(
    @Param('id') id: string,
    @Param('chunkId') chunkId: string,
    @Body() dto: UpdateChunkDto,
  ): Promise<SessionResponseDto> {
    return this.sessionService.updateChunk(id, chunkId, dto);
  }

  @Post(':id/chunks/add')
  @ApiOperation({ summary: 'Add a new chunk to the session' })
  @ApiResponse({ status: 200, description: 'Chunk added', type: SessionResponseDto })
  async addChunk(
    @Param('id') id: string,
    @Body() body: { text: string },
  ): Promise<SessionResponseDto> {
    return this.sessionService.addChunk(id, body.text);
  }

  @Post(':id/chunks/generate')
  @ApiOperation({ summary: 'Generate a chunk using AI web search' })
  @ApiResponse({ status: 200, description: 'Chunk generated and added', type: SessionResponseDto })
  async generateChunk(
    @Param('id') id: string,
    @Body() body: { prompt: string },
  ): Promise<SessionResponseDto> {
    const text = await this.agentService.generateChunkContent(body.prompt);
    return this.sessionService.addChunk(id, text);
  }

  @Post(':id/preview')
  @ApiOperation({ summary: 'Lock session and validate before publishing' })
  @ApiResponse({ status: 200, description: 'Preview generated', type: PreviewResponseDto })
  async preview(@Param('id') id: string): Promise<PreviewResponseDto> {
    return this.sessionService.preview(id);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish chunks to collection' })
  @ApiResponse({ status: 200, description: 'Chunks published', type: PublishResponseDto })
  async publish(
    @Param('id') id: string,
    @Body() dto: PublishDto,
    @User() user: RequestUser,
  ): Promise<PublishResponseDto> {
    return this.sessionService.publish(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a session' })
  @ApiResponse({ status: 200, description: 'Session deleted', type: DeleteSessionResponseDto })
  @ApiResponse({ status: 400, description: 'Cannot delete published session', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Session not found', type: ErrorResponseDto })
  async deleteSession(
    @Param('id') id: string,
    @User() user: RequestUser,
  ): Promise<DeleteSessionResponseDto> {
    return this.sessionService.deleteSession(id, user.id);
  }
}
