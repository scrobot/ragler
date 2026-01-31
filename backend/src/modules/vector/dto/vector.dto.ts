import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class SearchRequestDto {
  @ApiProperty({ example: 'How do I configure authentication?' })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  @IsNotEmpty()
  collectionId: string;

  @ApiProperty({ example: 10, required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class SearchResultDto {
  @ApiProperty({ example: 'point_uuid' })
  id: string;

  @ApiProperty({ example: 0.95 })
  score: number;

  @ApiProperty({ example: 'The authentication process involves...' })
  content: string;

  @ApiProperty({ example: 'https://...' })
  sourceUrl: string;

  @ApiProperty({ example: 'confluence' })
  sourceType: string;
}

export class SearchResponseDto {
  @ApiProperty({ type: [SearchResultDto] })
  results: SearchResultDto[];

  @ApiProperty({ example: 5 })
  total: number;

  @ApiProperty({ example: 'How do I configure authentication?' })
  query: string;
}
