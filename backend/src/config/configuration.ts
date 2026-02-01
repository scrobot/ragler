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
  };
};
