import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateCollectionDto {
  @ApiProperty({ example: 'Support FAQ', description: 'Collection name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'L2 support answers for common questions', description: 'Collection description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
