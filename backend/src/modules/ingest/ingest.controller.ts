import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { IngestService } from './ingest.service';
import {
  IngestConfluenceDto,
  IngestWebDto,
  IngestManualDto,
  IngestResponseDto,
} from './dto';
import { User, RequestUser } from '@common/decorators';

@ApiTags('Ingest')
@ApiHeader({ name: 'X-User-ID', required: true, description: 'User identifier' })
@Controller('ingest')
export class IngestController {
  constructor(private readonly ingestService: IngestService) { }

  @Post('confluence')
  @ApiOperation({ summary: 'Start ingestion session from Confluence' })
  @ApiResponse({ status: 201, description: 'Session created', type: IngestResponseDto })
  async ingestConfluence(
    @Body() dto: IngestConfluenceDto,
    @User() user: RequestUser,
  ): Promise<IngestResponseDto> {
    return this.ingestService.ingestConfluence(dto, user.id);
  }

  @Post('web')
  @ApiOperation({ summary: 'Start ingestion session from Web URL' })
  @ApiResponse({ status: 201, description: 'Session created', type: IngestResponseDto })
  async ingestWeb(
    @Body() dto: IngestWebDto,
    @User() user: RequestUser,
  ): Promise<IngestResponseDto> {
    return this.ingestService.ingestWeb(dto, user.id);
  }

  @Post('manual')
  @ApiOperation({ summary: 'Start ingestion session from Manual Text' })
  @ApiResponse({ status: 201, description: 'Session created', type: IngestResponseDto })
  async ingestManual(
    @Body() dto: IngestManualDto,
    @User() user: RequestUser,
  ): Promise<IngestResponseDto> {
    return this.ingestService.ingestManual(dto, user.id);
  }
}
