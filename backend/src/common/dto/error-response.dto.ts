import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({ example: 'Validation failed', oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  message: string | string[];

  @ApiProperty({ example: '2026-01-31T12:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/collections' })
  path: string;
}
