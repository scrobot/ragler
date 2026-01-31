export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
});
