import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { IngestService } from './ingest.service';
import { IngestRequestDto, IngestResponseDto } from './dto';
import { User, RequestUser } from '@common/decorators';

@ApiTags('Ingest')
@ApiHeader({ name: 'X-User-ID', required: true, description: 'User identifier' })
@ApiHeader({ name: 'X-User-Role', required: false, description: 'User role (ML, DEV, L2)' })
@Controller('ingest')
export class IngestController {
  constructor(private readonly ingestService: IngestService) { }

  @Post()
  @ApiOperation({ summary: 'Start ingestion session' })
  @ApiResponse({ status: 201, description: 'Session created', type: IngestResponseDto })
  async ingest(
    @Body() dto: IngestRequestDto,
    @User() user: RequestUser,
  ): Promise<IngestResponseDto> {
    return this.ingestService.ingest(dto, user.id);
  }
}
