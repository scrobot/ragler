import { z } from 'zod';

export const ErrorResponseSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.union([z.string(), z.array(z.string())]),
  timestamp: z.string(),
  path: z.string(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export interface ApiResponse<T> {
  data: T;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
