import { Controller, Post, Body, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiConsumes } from '@nestjs/swagger';
import { IngestService } from './ingest.service';
import {
  IngestConfluenceDto,
  IngestWebDto,
  IngestManualDto,
  IngestResponseDto,
} from './dto';
import { User, RequestUser } from '@common/decorators';
import { SUPPORTED_EXTENSIONS } from './parsers';
import { RequireFeature } from '@config/feature-flag.guard';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@ApiTags('Ingest')
@ApiHeader({ name: 'X-User-ID', required: true, description: 'User identifier' })
@Controller('ingest')
export class IngestController {
  constructor(private readonly ingestService: IngestService) { }

  @Post('confluence')
  @RequireFeature('confluenceIngest')
  @ApiOperation({ summary: 'Start ingestion session from Confluence' })
  @ApiResponse({ status: 201, description: 'Session created', type: IngestResponseDto })
  async ingestConfluence(
    @Body() dto: IngestConfluenceDto,
    @User() user: RequestUser,
  ): Promise<IngestResponseDto> {
    return this.ingestService.ingestConfluence(dto, user.id);
  }

  @Post('web')
  @RequireFeature('webIngest')
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

  @Post('file')
  @RequireFeature('fileIngest')
  @ApiOperation({ summary: 'Start ingestion session from file upload' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Session created', type: IngestResponseDto })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  async ingestFile(
    @UploadedFile() file: Express.Multer.File,
    @User() user: RequestUser,
  ): Promise<IngestResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const extension = file.originalname
      .substring(file.originalname.lastIndexOf('.'))
      .toLowerCase();

    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      throw new BadRequestException(
        `Unsupported file type "${extension}". Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`,
      );
    }

    return this.ingestService.ingestFile(file, user.id);
  }
}
