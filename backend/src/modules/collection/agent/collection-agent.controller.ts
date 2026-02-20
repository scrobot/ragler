import {
  Controller,
  Post,
  Param,
  Body,
  Res,
  Headers,
  HttpCode,
  HttpStatus,
  Delete,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiHeader, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { ZodValidationPipe } from 'nestjs-zod';
import { CollectionAgentService } from './collection-agent.service';
import { AgentChatDto, AgentChatSchema, ApproveOperationDto, ApproveOperationSchema } from '../dto/agent.dto';

@ApiTags('Collection Agent')
@Controller('collections/:collectionId/agent')
export class CollectionAgentController {
  private readonly logger = new Logger(CollectionAgentController.name);

  constructor(private readonly agentService: CollectionAgentService) {}

  @Post('chat')
  @ApiOperation({
    summary: 'Chat with collection AI assistant (SSE stream)',
    description:
      'Streams agent responses as Server-Sent Events. The agent can analyze collection quality, suggest operations, and execute approved changes.',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiHeader({ name: 'x-user-id', description: 'User ID', required: true })
  @ApiBody({ type: AgentChatDto })
  @ApiResponse({
    status: 200,
    description: 'SSE stream of agent events',
    content: {
      'text/event-stream': {
        schema: {
          type: 'string',
          description: 'Server-Sent Events stream',
        },
      },
    },
  })
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

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Flush headers immediately
    res.flushHeaders();

    try {
      const generator = this.agentService.streamChat(
        collectionId,
        userId,
        dto.message,
        dto.sessionId,
      );

      for await (const event of generator) {
        // Write SSE-formatted event
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (error) {
      this.logger.error({
        event: 'agent_chat_stream_error',
        collectionId,
        sessionId: dto.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Send error event
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
  @ApiOperation({
    summary: 'Chat with collection AI assistant (synchronous)',
    description:
      'Non-streaming endpoint for simple chat interactions. Returns the complete response after processing.',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiHeader({ name: 'x-user-id', description: 'User ID', required: true })
  @ApiBody({ type: AgentChatDto })
  @ApiResponse({
    status: 200,
    description: 'Agent response with tool calls',
    schema: {
      type: 'object',
      properties: {
        response: { type: 'string' },
        toolCalls: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tool: { type: 'string' },
              input: { type: 'object' },
              output: { type: 'object' },
            },
          },
        },
      },
    },
  })
  async chatSync(
    @Param('collectionId') collectionId: string,
    @Body(new ZodValidationPipe(AgentChatSchema)) dto: AgentChatDto,
    @Headers('x-user-id') userId: string,
  ): Promise<{ response: string; toolCalls: Array<{ tool: string; input: unknown; output: unknown }> }> {
    this.logger.log({
      event: 'agent_chat_sync_request',
      collectionId,
      sessionId: dto.sessionId,
      userId,
    });

    return this.agentService.chat(collectionId, userId, dto.message, dto.sessionId);
  }

  @Post('approve/:operationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve a suggested operation',
    description:
      'Approves an operation suggested by the agent, allowing it to be executed via execute_operation tool.',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiParam({ name: 'operationId', description: 'Operation UUID to approve' })
  @ApiBody({ type: ApproveOperationDto })
  @ApiResponse({
    status: 200,
    description: 'Operation approved',
    schema: {
      type: 'object',
      properties: {
        approved: { type: 'boolean' },
        operationId: { type: 'string' },
      },
    },
  })
  async approveOperation(
    @Param('collectionId') collectionId: string,
    @Param('operationId') operationId: string,
    @Body(new ZodValidationPipe(ApproveOperationSchema)) dto: ApproveOperationDto,
  ): Promise<{ approved: boolean; operationId: string }> {
    this.logger.log({
      event: 'approve_operation_request',
      collectionId,
      operationId,
      sessionId: dto.sessionId,
    });

    await this.agentService.approveOperation(dto.sessionId, operationId);
    return { approved: true, operationId };
  }

  @Post('revoke/:operationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke operation approval',
    description: 'Revokes a previously approved operation.',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiParam({ name: 'operationId', description: 'Operation UUID to revoke' })
  @ApiBody({ type: ApproveOperationDto })
  @ApiResponse({
    status: 200,
    description: 'Operation approval revoked',
    schema: {
      type: 'object',
      properties: {
        revoked: { type: 'boolean' },
        operationId: { type: 'string' },
      },
    },
  })
  async revokeApproval(
    @Param('collectionId') collectionId: string,
    @Param('operationId') operationId: string,
    @Body(new ZodValidationPipe(ApproveOperationSchema)) dto: ApproveOperationDto,
  ): Promise<{ revoked: boolean; operationId: string }> {
    this.logger.log({
      event: 'revoke_approval_request',
      collectionId,
      operationId,
      sessionId: dto.sessionId,
    });

    await this.agentService.revokeApproval(dto.sessionId, operationId);
    return { revoked: true, operationId };
  }

  @Delete('session/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Clear agent session',
    description: 'Clears conversation history and approved operations for a session.',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID to clear' })
  @ApiResponse({ status: 204, description: 'Session cleared' })
  async clearSession(
    @Param('collectionId') collectionId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<void> {
    this.logger.log({
      event: 'clear_session_request',
      collectionId,
      sessionId,
    });

    await this.agentService.clearSession(sessionId);
  }
}
