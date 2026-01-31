import { ApiProperty } from '@nestjs/swagger';

export class CollectionResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Support FAQ' })
  name: string;

  @ApiProperty({ example: 'L2 support answers for common questions' })
  description: string;

  @ApiProperty({ example: 'user@company.com' })
  createdBy: string;

  @ApiProperty({ example: '2026-01-31T12:00:00.000Z' })
  createdAt: string;
}

export class CollectionListResponseDto {
  @ApiProperty({ type: [CollectionResponseDto] })
  collections: CollectionResponseDto[];

  @ApiProperty({ example: 5 })
  total: number;
}
