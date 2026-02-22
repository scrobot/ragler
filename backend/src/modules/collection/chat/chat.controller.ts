import { Controller, Post, Param, Body } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiHeader,
    ApiParam,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatRequestDto, ChatResponseDto } from '../dto';
import { User, RequestUser } from '@common/decorators';
import { ErrorResponseDto } from '@common/dto';

@ApiTags('Collection Chat')
@ApiHeader({ name: 'X-User-ID', required: true, description: 'User identifier' })
@Controller('collections/:collectionId/chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Post()
    @ApiOperation({
        summary: 'Chat with collection knowledge base',
        description: 'Send a message and get a RAG-powered response using the collection\'s knowledge',
    })
    @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
    @ApiResponse({
        status: 200,
        description: 'Chat response with answer and cited sources',
        type: ChatResponseDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Collection not found',
        type: ErrorResponseDto,
    })
    async chat(
        @Param('collectionId') collectionId: string,
        @Body() dto: ChatRequestDto,
        @User() user: RequestUser,
    ): Promise<ChatResponseDto> {
        return this.chatService.chat(collectionId, dto.message, dto.sessionId);
    }
}
