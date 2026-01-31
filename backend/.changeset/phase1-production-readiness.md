---
"kms-rag-backend": minor
---

Add production readiness features

- **Config validation**: Zod-based environment validation on startup; fails fast with clear error messages if required vars (REDIS_HOST, QDRANT_URL, OPENAI_API_KEY) are missing
- **Health endpoints**: `/api/health`, `/api/health/liveness`, `/api/health/readiness` with Redis and Qdrant connectivity checks via @nestjs/terminus
- **Rate limiting**: Global throttling at 100 requests/minute (configurable via THROTTLE_TTL, THROTTLE_LIMIT env vars)
- **Security headers**: Helmet middleware for standard security headers (XSS, clickjacking, etc.)
- **Graceful shutdown**: SIGTERM/SIGINT handlers with 30s timeout; leverages NestJS shutdown hooks for clean Redis disconnection
- **CI/CD**: GitHub Actions workflow with Redis/Qdrant services for lint, typecheck, build, and test

New environment variables:
- `NODE_ENV` (optional, defaults to "development")
- `THROTTLE_TTL` (optional, defaults to 60000ms)
- `THROTTLE_LIMIT` (optional, defaults to 100 requests)
