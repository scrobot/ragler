import { z } from 'zod';

export const envSchema = z.object({
  // Server
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Redis
  REDIS_HOST: z.string().min(1, 'REDIS_HOST is required'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),

  // Qdrant
  QDRANT_URL: z.string().url('QDRANT_URL must be a valid URL'),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),

  // Rate limiting
  THROTTLE_TTL: z.coerce.number().int().positive().default(60000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),

  // Session
  SESSION_TTL: z.coerce.number().int().positive().default(86400),

  // Web ingestion
  WEB_FETCH_TIMEOUT: z.coerce.number().int().positive().default(30000),
  WEB_FETCH_USER_AGENT: z.string().default('KMS-RAG Bot/1.0'),
  WEB_MAX_CONTENT_LENGTH: z.coerce.number().int().positive().default(10485760),

  // Confluence ingestion (optional - only required for Confluence sources)
  CONFLUENCE_BASE_URL: z.string().url().optional(),
  CONFLUENCE_USER_EMAIL: z.string().email().optional(),
  CONFLUENCE_API_TOKEN: z.string().min(1).optional(),
  CONFLUENCE_FETCH_TIMEOUT: z.coerce.number().int().positive().default(30000),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    const errors = Object.entries(formatted)
      .filter(([key]) => key !== '_errors')
      .map(([key, value]) => {
        const messages = (value as { _errors: string[] })._errors;
        return `  ${key}: ${messages.join(', ')}`;
      })
      .join('\n');

    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return result.data;
}
