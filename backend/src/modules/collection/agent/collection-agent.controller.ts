import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Res,
  Headers,
  Query,
  HttpCode,
  HttpStatus,
  Delete,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiHeader, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ZodValidationPipe } from 'nestjs-zod';
import { CollectionAgentService } from './collection-agent.service';
import { AgentMemoryService } from './memory/redis-memory';
import { PromptService } from './prompts/prompt.service';
import { AgentChatDto, AgentChatSchema, ApproveOperationDto, ApproveOperationSchema } from '../dto/agent.dto';

@ApiTags('Collection Agent')
@Controller('collections/:collectionId/agent')
export class CollectionAgentController {
  private readonly logger = new Logger(CollectionAgentController.name);

  constructor(
    private readonly agentService: CollectionAgentService,
    private readonly memoryService: AgentMemoryService,
    private readonly promptService: PromptService,
  ) { }

  // ============================================================================
  // Chat
  // ============================================================================

  @Post('chat')
  @ApiOperation({
    summary: 'Chat with collection AI assistant (SSE stream)',
    description:
      'Streams agent responses as Server-Sent Events. The agent can analyze collection quality, suggest operations, and execute approved changes.',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiHeader({ name: 'x-user-id', description: 'User ID', required: true })
  @ApiBody({ type: AgentChatDto })
  async chat(
    @Param('collectionId') collectionId: string,
    @Body(new ZodValidationPipe(AgentChatSchema)) dto: AgentChatDto,
    @Headers('x-user-id') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log({
      event: 'agent_chat_request',
      collectionId,
      sessionId: dto.sessionId,
      userId,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const generator = this.agentService.streamChat(
        collectionId,
        userId,
        dto.message,
        dto.sessionId,
      );

      for await (const event of generator) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (error) {
      this.logger.error({
        event: 'agent_chat_stream_error',
        collectionId,
        sessionId: dto.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post('clean')
  @ApiOperation({
    summary: 'Clean collection — scan and remove junk chunks (SSE stream)',
    description:
      'Programmatically scans all chunks in the collection, identifies dirty chunks (HTML-only, too short, whitespace, empty) and deletes them. Streams progress as SSE events.',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  async clean(
    @Param('collectionId') collectionId: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log({ event: 'clean_collection_request', collectionId });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const generator = this.agentService.streamCleanCollection(collectionId);

      for await (const event of generator) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (error) {
      this.logger.error({
        event: 'clean_collection_stream_error',
        collectionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post('chat/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chat with collection AI assistant (synchronous)' })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiHeader({ name: 'x-user-id', description: 'User ID', required: true })
  @ApiBody({ type: AgentChatDto })
  async chatSync(
    @Param('collectionId') collectionId: string,
    @Body(new ZodValidationPipe(AgentChatSchema)) dto: AgentChatDto,
    @Headers('x-user-id') userId: string,
  ): Promise<{ response: string; toolCalls: Array<{ tool: string; input: unknown; output: unknown }> }> {
    return this.agentService.chat(collectionId, userId, dto.message, dto.sessionId);
  }

  // ============================================================================
  // Sessions
  // ============================================================================

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new chat session' })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiHeader({ name: 'x-user-id', description: 'User ID', required: true })
  async createSession(
    @Param('collectionId') collectionId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { title?: string },
  ): Promise<{ id: string; title: string; collectionId: string; createdAt: string }> {
    const session = await this.memoryService.createSession(userId, collectionId, body.title);
    return { id: session.id, title: session.title, collectionId: session.collectionId, createdAt: session.createdAt };
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List chat sessions for the current user' })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiHeader({ name: 'x-user-id', description: 'User ID', required: true })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async listSessions(
    @Headers('x-user-id') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ sessions: Array<{ id: string; title: string; collectionId: string; createdAt: string; updatedAt: string }> }> {
    const sessions = await this.memoryService.listSessions(
      userId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
    return { sessions };
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get session with conversation history' })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  async getSession(
    @Param('sessionId') sessionId: string,
  ): Promise<{
    session: { id: string; title: string; collectionId: string; createdAt: string; updatedAt: string } | null;
    messages: Array<{ role: string; content: string }>;
  }> {
    const [session, messages] = await Promise.all([
      this.memoryService.getSession(sessionId),
      this.memoryService.loadHistory(sessionId),
    ]);

    return { session, messages };
  }

  @Patch('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rename a session' })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  async renameSession(
    @Param('sessionId') sessionId: string,
    @Body() body: { title: string },
  ): Promise<{ success: boolean }> {
    await this.memoryService.updateSessionTitle(sessionId, body.title);
    return { success: true };
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a session and its history' })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  async deleteSession(
    @Param('sessionId') sessionId: string,
  ): Promise<void> {
    await this.memoryService.deleteSession(sessionId);
  }

  // ============================================================================
  // Legacy session/operation endpoints
  // ============================================================================

  @Post('approve/:operationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a suggested operation' })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiParam({ name: 'operationId', description: 'Operation UUID to approve' })
  @ApiBody({ type: ApproveOperationDto })
  async approveOperation(
    @Param('operationId') operationId: string,
    @Body(new ZodValidationPipe(ApproveOperationSchema)) dto: ApproveOperationDto,
  ): Promise<{ approved: boolean; operationId: string }> {
    await this.agentService.approveOperation(dto.sessionId, operationId);
    return { approved: true, operationId };
  }

  @Post('revoke/:operationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke operation approval' })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiParam({ name: 'operationId', description: 'Operation UUID to revoke' })
  @ApiBody({ type: ApproveOperationDto })
  async revokeApproval(
    @Param('operationId') operationId: string,
    @Body(new ZodValidationPipe(ApproveOperationSchema)) dto: ApproveOperationDto,
  ): Promise<{ revoked: boolean; operationId: string }> {
    await this.agentService.revokeApproval(dto.sessionId, operationId);
    return { revoked: true, operationId };
  }

  @Delete('session/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear agent session (legacy)' })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID to clear' })
  async clearSession(
    @Param('sessionId') sessionId: string,
  ): Promise<void> {
    await this.agentService.clearSession(sessionId);
  }

  // ============================================================================
  // Prompts
  // ============================================================================

  @Get('prompts/global')
  @ApiOperation({ summary: 'Get the global system prompt' })
  async getGlobalPrompt(): Promise<{ prompt: string; isDefault: boolean }> {
    const prompt = await this.promptService.getGlobalPrompt();
    const defaultPrompt = this.promptService.getDefaultPrompt();
    return { prompt, isDefault: prompt === defaultPrompt };
  }

  @Get('prompts/default')
  @ApiOperation({ summary: 'Get the hardcoded default prompt' })
  getDefaultPrompt(): { prompt: string } {
    return { prompt: this.promptService.getDefaultPrompt() };
  }

  @Patch('prompts/global')
  @ApiOperation({ summary: 'Update the global system prompt' })
  @ApiBody({ schema: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] } })
  async updateGlobalPrompt(
    @Body() body: { prompt: string },
  ): Promise<{ success: boolean }> {
    await this.promptService.setGlobalPrompt(body.prompt);
    return { success: true };
  }

  @Delete('prompts/global')
  @ApiOperation({ summary: 'Reset global prompt to default' })
  async resetGlobalPrompt(): Promise<{ success: boolean }> {
    await this.promptService.resetGlobalPrompt();
    return { success: true };
  }

  @Get('prompt')
  @ApiOperation({ summary: 'Get collection-specific prompt override' })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  async getCollectionPrompt(
    @Param('collectionId') collectionId: string,
  ): Promise<{ prompt: string | null; hasOverride: boolean }> {
    const prompt = await this.promptService.getCollectionPrompt(collectionId);
    return { prompt, hasOverride: prompt !== null };
  }

  @Patch('prompt')
  @ApiOperation({ summary: 'Set collection-specific prompt override' })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiBody({ schema: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] } })
  async updateCollectionPrompt(
    @Param('collectionId') collectionId: string,
    @Body() body: { prompt: string },
  ): Promise<{ success: boolean }> {
    await this.promptService.setCollectionPrompt(collectionId, body.prompt);
    return { success: true };
  }

  @Delete('prompt')
  @ApiOperation({ summary: 'Remove collection prompt override (revert to global)' })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  async deleteCollectionPrompt(
    @Param('collectionId') collectionId: string,
  ): Promise<{ success: boolean }> {
    await this.promptService.deleteCollectionPrompt(collectionId);
    return { success: true };
  }
}
