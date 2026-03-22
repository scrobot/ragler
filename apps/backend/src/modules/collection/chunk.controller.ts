import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { ChunkService } from './chunk.service';
import {
  ListChunksQueryDto,
  EditorChunkResponseDto,
  EditorChunkListResponseDto,
  EditorCreateChunkDto,
  EditorUpdateChunkDto,
  EditorSplitChunkDto,
  EditorMergeChunksDto,
  ReorderChunksDto,
  UpdateQualityScoreDto,
  DocumentListResponseDto,
} from './dto';
import { User, RequestUser } from '@common/decorators';
import { ErrorResponseDto } from '@common/dto';

@ApiTags('Collection Editor - Chunks')
@ApiHeader({ name: 'X-User-ID', required: true, description: 'User identifier' })
@Controller('collections/:collectionId/chunks')
export class ChunkController {
  constructor(private readonly chunkService: ChunkService) { }

  @Get()
  @ApiOperation({
    summary: 'List chunks in collection',
    description: 'Get paginated list of chunks with optional sorting',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of chunks',
    type: EditorChunkListResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Collection not found',
    type: ErrorResponseDto,
  })
  async listChunks(
    @Param('collectionId') collectionId: string,
    @Query() query: ListChunksQueryDto,
  ): Promise<EditorChunkListResponseDto> {
    return this.chunkService.listChunks(collectionId, query);
  }

  @Get(':chunkId')
  @ApiOperation({ summary: 'Get chunk by ID' })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiParam({ name: 'chunkId', description: 'Chunk UUID' })
  @ApiResponse({
    status: 200,
    description: 'Chunk details',
    type: EditorChunkResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Chunk not found',
    type: ErrorResponseDto,
  })
  async getChunk(
    @Param('collectionId') collectionId: string,
    @Param('chunkId') chunkId: string,
  ): Promise<EditorChunkResponseDto> {
    return this.chunkService.getChunk(collectionId, chunkId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create new chunk',
    description: 'Create a new chunk directly in the collection (no session)',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiResponse({
    status: 201,
    description: 'Chunk created',
    type: EditorChunkResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Collection not found',
    type: ErrorResponseDto,
  })
  async createChunk(
    @Param('collectionId') collectionId: string,
    @Body() dto: EditorCreateChunkDto,
    @User() user: RequestUser,
  ): Promise<EditorChunkResponseDto> {
    return this.chunkService.createChunk(collectionId, dto, user.id);
  }

  @Put(':chunkId')
  @ApiOperation({
    summary: 'Update chunk',
    description: 'Update chunk content, tags, or metadata',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiParam({ name: 'chunkId', description: 'Chunk UUID' })
  @ApiResponse({
    status: 200,
    description: 'Chunk updated',
    type: EditorChunkResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Chunk not found',
    type: ErrorResponseDto,
  })
  async updateChunk(
    @Param('collectionId') collectionId: string,
    @Param('chunkId') chunkId: string,
    @Body() dto: EditorUpdateChunkDto,
    @User() user: RequestUser,
  ): Promise<EditorChunkResponseDto> {
    return this.chunkService.updateChunk(collectionId, chunkId, dto, user.id);
  }

  @Delete(':chunkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete chunk' })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiParam({ name: 'chunkId', description: 'Chunk UUID' })
  @ApiResponse({ status: 204, description: 'Chunk deleted' })
  @ApiResponse({
    status: 404,
    description: 'Chunk not found',
    type: ErrorResponseDto,
  })
  async deleteChunk(
    @Param('collectionId') collectionId: string,
    @Param('chunkId') chunkId: string,
    @User() user: RequestUser,
  ): Promise<void> {
    return this.chunkService.deleteChunk(collectionId, chunkId, user.id);
  }

  @Post(':chunkId/split')
  @ApiOperation({
    summary: 'Split chunk',
    description:
      'Split a chunk into multiple parts at specified positions or with explicit text blocks',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiParam({ name: 'chunkId', description: 'Chunk UUID to split' })
  @ApiResponse({
    status: 200,
    description: 'New chunks created from split',
    type: EditorChunkListResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Chunk not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid split parameters',
    type: ErrorResponseDto,
  })
  async splitChunk(
    @Param('collectionId') collectionId: string,
    @Param('chunkId') chunkId: string,
    @Body() dto: EditorSplitChunkDto,
    @User() user: RequestUser,
  ): Promise<EditorChunkListResponseDto> {
    return this.chunkService.splitChunk(collectionId, chunkId, dto, user.id);
  }

  @Post('merge')
  @ApiOperation({
    summary: 'Merge chunks',
    description: 'Merge multiple chunks into a single chunk',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiResponse({
    status: 200,
    description: 'Merged chunk',
    type: EditorChunkResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'One or more chunks not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid merge parameters',
    type: ErrorResponseDto,
  })
  async mergeChunks(
    @Param('collectionId') collectionId: string,
    @Body() dto: EditorMergeChunksDto,
    @User() user: RequestUser,
  ): Promise<EditorChunkResponseDto> {
    return this.chunkService.mergeChunks(collectionId, dto, user.id);
  }

  @Put(':chunkId/quality')
  @ApiOperation({
    summary: 'Update chunk quality score',
    description: 'Set AI-computed quality score and issues for a chunk',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiParam({ name: 'chunkId', description: 'Chunk UUID' })
  @ApiResponse({
    status: 200,
    description: 'Quality score updated',
    type: EditorChunkResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Chunk not found',
    type: ErrorResponseDto,
  })
  async updateQualityScore(
    @Param('collectionId') collectionId: string,
    @Param('chunkId') chunkId: string,
    @Body() dto: UpdateQualityScoreDto,
    @User() user: RequestUser,
  ): Promise<EditorChunkResponseDto> {
    return this.chunkService.updateQualityScore(
      collectionId,
      chunkId,
      dto,
      user.id,
    );
  }
}

/**
 * Separate controller for collection-level reorder operation
 * (not under /chunks path)
 */
@ApiTags('Collection Editor - Documents & Reorder')
@ApiHeader({ name: 'X-User-ID', required: true, description: 'User identifier' })
@Controller('collections/:collectionId')
export class CollectionReorderController {
  constructor(private readonly chunkService: ChunkService) { }

  @Get('documents')
  @ApiOperation({
    summary: 'List documents in collection',
    description: 'Get all source documents aggregated from chunk-level metadata',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of documents with chunk counts and quality scores',
    type: DocumentListResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Collection not found',
    type: ErrorResponseDto,
  })
  async listDocuments(
    @Param('collectionId') collectionId: string,
  ): Promise<DocumentListResponseDto> {
    return this.chunkService.listDocuments(collectionId);
  }

  @Put('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reorder chunks in collection',
    description: 'Update positions of multiple chunks for retrieval optimization',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection UUID' })
  @ApiResponse({ status: 204, description: 'Chunks reordered' })
  @ApiResponse({
    status: 404,
    description: 'One or more chunks not found',
    type: ErrorResponseDto,
  })
  async reorderChunks(
    @Param('collectionId') collectionId: string,
    @Body() dto: ReorderChunksDto,
    @User() user: RequestUser,
  ): Promise<void> {
    return this.chunkService.reorderChunks(collectionId, dto, user.id);
  }
}
