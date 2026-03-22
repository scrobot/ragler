import { createZodDto } from 'nestjs-zod';
import { ErrorResponseSchema, type ErrorResponse } from '@ragler/shared';

export { ErrorResponseSchema, type ErrorResponse };
export class ErrorResponseDto extends createZodDto(ErrorResponseSchema) {}
