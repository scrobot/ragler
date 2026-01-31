import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional, ArrayMinSize, IsNumber } from 'class-validator';

export class ChunkDto {
  @ApiProperty({ example: 'chunk_abc123' })
  id: string;

  @ApiProperty({ example: 'This is the chunk content...' })
  text: string;

  @ApiProperty({ example: false })
  isDirty: boolean;
}

export class SessionResponseDto {
  @ApiProperty({ example: 'session_abc123' })
  sessionId: string;

  @ApiProperty({ example: 'https://...' })
  sourceUrl: string;

  @ApiProperty({ example: 'DRAFT' })
  status: string;

  @ApiProperty({ type: [ChunkDto] })
  chunks: ChunkDto[];

  @ApiProperty({ example: '2026-01-31T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-31T12:00:00.000Z' })
  updatedAt: string;
}

export class MergeChunksDto {
  @ApiProperty({ example: ['chunk_1', 'chunk_2'], description: 'IDs of chunks to merge' })
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  chunkIds: string[];
}

export class SplitChunkDto {
  @ApiProperty({ example: [50, 120], description: 'Character indices to split at', required: false })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  splitPoints?: number[];

  @ApiProperty({ example: ['First part', 'Second part'], description: 'New text blocks after split', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  newTextBlocks?: string[];
}

export class UpdateChunkDto {
  @ApiProperty({ example: 'Updated chunk content...' })
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class PublishDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Target collection ID' })
  @IsString()
  @IsNotEmpty()
  targetCollectionId: string;
}

export class PreviewResponseDto {
  @ApiProperty({ example: 'session_abc123' })
  sessionId: string;

  @ApiProperty({ example: 'PREVIEW' })
  status: string;

  @ApiProperty({ type: [ChunkDto] })
  chunks: ChunkDto[];

  @ApiProperty({ example: true })
  isValid: boolean;

  @ApiProperty({ example: [], description: 'Validation warnings if any' })
  warnings: string[];
}

export class PublishResponseDto {
  @ApiProperty({ example: 'session_abc123' })
  sessionId: string;

  @ApiProperty({ example: 5 })
  publishedChunks: number;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  collectionId: string;
}
