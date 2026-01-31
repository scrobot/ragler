import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { CollectionService } from './collection.service';
import { CreateCollectionDto, CollectionResponseDto, CollectionListResponseDto } from './dto';
import { User, UserRole, RequestUser } from '../../common/decorators';
import { Roles } from '../../common/decorators';
import { RoleGuard } from '../../common/guards';
import { ErrorResponseDto } from '../../common/dto';

@ApiTags('Collections')
@ApiHeader({ name: 'X-User-ID', required: true, description: 'User identifier' })
@ApiHeader({ name: 'X-User-Role', required: false, description: 'User role (ML, DEV, L2)' })
@Controller('collections')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get()
  @ApiOperation({ summary: 'List all collections' })
  @ApiResponse({ status: 200, description: 'List of collections', type: CollectionListResponseDto })
  async findAll(): Promise<CollectionListResponseDto> {
    return this.collectionService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get collection by ID' })
  @ApiResponse({ status: 200, description: 'Collection details', type: CollectionResponseDto })
  @ApiResponse({ status: 404, description: 'Collection not found', type: ErrorResponseDto })
  async findOne(@Param('id') id: string): Promise<CollectionResponseDto> {
    return this.collectionService.findOne(id);
  }

  @Post()
  @UseGuards(RoleGuard)
  @Roles(UserRole.DEV, UserRole.ML)
  @ApiOperation({ summary: 'Create new collection (DEV/ML only)' })
  @ApiResponse({ status: 201, description: 'Collection created', type: CollectionResponseDto })
  @ApiForbiddenResponse({ description: 'Access denied for L2 users', type: ErrorResponseDto })
  async create(
    @Body() dto: CreateCollectionDto,
    @User() user: RequestUser,
  ): Promise<CollectionResponseDto> {
    return this.collectionService.create(dto, user.id);
  }

  @Delete(':id')
  @UseGuards(RoleGuard)
  @Roles(UserRole.DEV, UserRole.ML)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete collection (DEV/ML only)' })
  @ApiResponse({ status: 204, description: 'Collection deleted' })
  @ApiResponse({ status: 404, description: 'Collection not found', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Access denied for L2 users', type: ErrorResponseDto })
  async remove(@Param('id') id: string): Promise<void> {
    return this.collectionService.remove(id);
  }
}
