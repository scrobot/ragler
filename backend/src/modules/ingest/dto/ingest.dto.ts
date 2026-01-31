import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUrl } from 'class-validator';

export enum SourceType {
  CONFLUENCE = 'confluence',
  WEB = 'web',
  MANUAL = 'manual',
}

export class IngestRequestDto {
  @ApiProperty({ enum: SourceType, example: SourceType.CONFLUENCE })
  @IsEnum(SourceType)
  sourceType: SourceType;

  @ApiProperty({ example: 'https://company.atlassian.net/wiki/spaces/DOC/pages/123456', required: false })
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiProperty({ example: 'Manual content to be chunked...', required: false })
  @IsString()
  @IsOptional()
  content?: string;
}

export class IngestResponseDto {
  @ApiProperty({ example: 'session_abc123' })
  sessionId: string;

  @ApiProperty({ example: SourceType.CONFLUENCE })
  sourceType: SourceType;

  @ApiProperty({ example: 'https://company.atlassian.net/wiki/spaces/DOC/pages/123456' })
  sourceUrl: string;

  @ApiProperty({ example: 'DRAFT' })
  status: string;

  @ApiProperty({ example: '2026-01-31T12:00:00.000Z' })
  createdAt: string;
}
