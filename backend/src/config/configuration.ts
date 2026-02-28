import { validateEnv } from './env.schema';

export default () => {
  const env = validateEnv();

  return {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    redis: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
    },
    qdrant: {
      url: env.QDRANT_URL,
    },
    openai: {
      apiKey: env.OPENAI_API_KEY,
    },
    llm: {
      chunking: {
        timeout: env.LLM_CHUNKING_TIMEOUT,
        maxRetries: env.LLM_CHUNKING_MAX_RETRIES,
        maxContentLength: env.LLM_CHUNKING_MAX_CONTENT_LENGTH,
      },
      embedding: {
        timeout: env.LLM_EMBEDDING_TIMEOUT,
        maxRetries: env.LLM_EMBEDDING_MAX_RETRIES,
        batchSize: env.LLM_EMBEDDING_BATCH_SIZE,
      },
    },
    throttle: {
      ttl: env.THROTTLE_TTL,
      limit: env.THROTTLE_LIMIT,
    },
    session: {
      ttl: env.SESSION_TTL,
    },
    web: {
      fetchTimeout: env.WEB_FETCH_TIMEOUT,
      userAgent: env.WEB_FETCH_USER_AGENT,
      maxContentLength: env.WEB_MAX_CONTENT_LENGTH,
    },
    confluence: {
      baseUrl: env.CONFLUENCE_BASE_URL,
      userEmail: env.CONFLUENCE_USER_EMAIL,
      apiToken: env.CONFLUENCE_API_TOKEN,
      fetchTimeout: env.CONFLUENCE_FETCH_TIMEOUT,
    },
    manual: {
      maxContentLength: env.MANUAL_MAX_CONTENT_LENGTH,
      minContentLength: env.MANUAL_MIN_CONTENT_LENGTH,
    },
    sqlite: {
      path: env.SQLITE_PATH,
    },
    features: {
      confluenceIngest: env.FEATURE_CONFLUENCE_INGEST,
      webIngest: env.FEATURE_WEB_INGEST,
      fileIngest: env.FEATURE_FILE_INGEST,
      agent: env.FEATURE_AGENT,
    },
  };
};
