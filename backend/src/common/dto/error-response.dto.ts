import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ErrorResponseSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.union([z.string(), z.array(z.string())]),
  timestamp: z.string(),
  path: z.string(),
});

export class ErrorResponseDto extends createZodDto(ErrorResponseSchema) {}
