import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { VectorService } from './vector.service';
import { SearchRequestDto, SearchResponseDto } from './dto';
import { User, RequestUser } from '@common/decorators';
import { ErrorResponseDto } from '@common/dto';
import { Logger } from '@nestjs/common';

@ApiTags('Search')
@ApiHeader({ name: 'X-User-ID', required: true, description: 'User identifier' })
@ApiHeader({ name: 'X-User-Role', required: false, description: 'User role (ML, DEV, L2)' })
@Controller('search')
export class VectorController {
  private readonly logger = new Logger(VectorController.name);

  constructor(private readonly vectorService: VectorService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search knowledge collections' })
  @ApiResponse({ status: 200, description: 'Search results', type: SearchResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Collection not found', type: ErrorResponseDto })
  async search(
    @Body() dto: SearchRequestDto,
    @User() user: RequestUser,
  ): Promise<SearchResponseDto> {
    this.logger.log({
      event: 'search_request',
      user_id: user.id,
      collection_id: dto.collectionId,
      query_length: dto.query.length,
      limit: dto.limit,
    });

    return this.vectorService.search(dto);
  }
}
