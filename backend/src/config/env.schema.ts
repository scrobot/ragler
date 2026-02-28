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

  // Manual ingestion
  MANUAL_MAX_CONTENT_LENGTH: z.coerce.number().int().positive().default(102400), // 100KB
  MANUAL_MIN_CONTENT_LENGTH: z.coerce.number().int().nonnegative().default(1),

  // LLM chunking
  LLM_CHUNKING_TIMEOUT: z.coerce.number().int().positive().default(60000), // 60s
  LLM_CHUNKING_MAX_RETRIES: z.coerce.number().int().nonnegative().default(2),
  LLM_CHUNKING_MAX_CONTENT_LENGTH: z.coerce.number().int().positive().default(30000), // 30k chars

  // LLM embedding
  LLM_EMBEDDING_TIMEOUT: z.coerce.number().int().positive().default(30000), // 30s
  LLM_EMBEDDING_MAX_RETRIES: z.coerce.number().int().nonnegative().default(2),
  LLM_EMBEDDING_BATCH_SIZE: z.coerce.number().int().positive().default(100), // Max texts per API call

  // SQLite
  SQLITE_PATH: z.string().default('data/ragler.db'),

  // Feature flags (all default to enabled)
  FEATURE_CONFLUENCE_INGEST: z.coerce.boolean().default(true),
  FEATURE_WEB_INGEST: z.coerce.boolean().default(true),
  FEATURE_FILE_INGEST: z.coerce.boolean().default(true),
  FEATURE_AGENT: z.coerce.boolean().default(true),
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
