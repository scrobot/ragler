---
sidebar_position: 4
title: Troubleshooting
---

# Troubleshooting Guide

This guide covers common issues you might encounter when running RAGler and how to resolve them.

## Installation Issues

### Cannot Install Dependencies (`pnpm install` fails)

**Symptoms:**
```
ERR_PNPM_FETCH_404  GET https://registry.npmjs.org/@somepackage
```

**Solutions:**

1. **Clear pnpm cache:**
   ```bash
   pnpm store prune
   pnpm install
   ```

2. **Check Node.js version:**
   ```bash
   node --version  # Should be 20+
   ```

3. **Reinstall pnpm:**
   ```bash
   npm install -g pnpm@latest
   ```

4. **Delete lockfile and retry:**
   ```bash
   rm pnpm-lock.yaml
   pnpm install
   ```

### Docker Compose Not Found

**Symptoms:**
```
docker: 'compose' is not a docker command
```

**Solutions:**

1. **Update Docker:** Docker Compose v2 is built into Docker 20.10+
   - Download from [docker.com](https://docs.docker.com/get-docker/)

2. **Use `docker-compose` (v1) instead:**
   ```bash
   docker-compose up -d redis qdrant
   ```

3. **Install Docker Compose plugin:**
   ```bash
   # On Linux
   sudo apt-get update
   sudo apt-get install docker-compose-plugin
   ```

## Connection Issues

### Cannot Connect to Redis

**Symptoms:**
```
Error: Redis connection failed: connect ECONNREFUSED 127.0.0.1:6379
```

**Solutions:**

1. **Check if Redis is running:**
   ```bash
   docker compose ps redis
   ```

2. **Start Redis:**
   ```bash
   docker compose up -d redis
   ```

3. **Verify Redis is accessible:**
   ```bash
   redis-cli ping
   # Expected: PONG
   ```

4. **Check Redis logs:**
   ```bash
   docker compose logs redis
   ```

5. **Restart Redis:**
   ```bash
   docker compose restart redis
   ```

6. **Check `.env` configuration:**
   ```bash
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

### Cannot Connect to Qdrant

**Symptoms:**
```
Error: Qdrant connection failed: connect ECONNREFUSED 127.0.0.1:6333
```

**Solutions:**

1. **Check if Qdrant is running:**
   ```bash
   docker compose ps qdrant
   ```

2. **Start Qdrant:**
   ```bash
   docker compose up -d qdrant
   ```

3. **Verify Qdrant is accessible:**
   ```bash
   curl http://localhost:6333/health
   # Expected: {"status":"ok"}
   ```

4. **Check Qdrant logs:**
   ```bash
   docker compose logs qdrant
   ```

5. **Restart Qdrant:**
   ```bash
   docker compose restart qdrant
   ```

6. **Check `.env` configuration:**
   ```bash
   QDRANT_URL=http://localhost:6333
   ```

### OpenAI API Connection Issues

**Symptoms:**
```
Error: OpenAI API request failed: 401 Unauthorized
```

**Solutions:**

1. **Verify API key is set:**
   ```bash
   grep OPENAI_API_KEY backend/.env
   ```

2. **Check API key validity:**
   - Log in to [platform.openai.com](https://platform.openai.com/)
   - Navigate to API Keys
   - Verify your key is active
   - Check usage limits

3. **Regenerate API key if needed:**
   - Create a new API key
   - Update `.env` with the new key
   - Restart the backend server

4. **Check OpenAI service status:**
   - Visit [status.openai.com](https://status.openai.com/)

## Configuration Issues

### Missing Environment Variable

**Symptoms:**
```
Error: Missing required environment variable: OPENAI_API_KEY
```

**Solutions:**

1. **Copy `.env.example`:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Edit `.env` and add the missing variable:**
   ```bash
   OPENAI_API_KEY=sk-your-key-here
   ```

3. **Restart the backend:**
   ```bash
   pnpm start:dev
   ```

### Port Already in Use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**

1. **Find process using the port:**
   ```bash
   # On macOS/Linux
   lsof -i :3000

   # On Windows
   netstat -ano | findstr :3000
   ```

2. **Kill the process:**
   ```bash
   # On macOS/Linux
   kill -9 <PID>

   # On Windows
   taskkill /PID <PID> /F
   ```

3. **Or change the port in `.env`:**
   ```bash
   PORT=3001
   ```

## Runtime Issues

### Session Not Found

**Symptoms:**
```
Error: Session sess_abc123 not found
```

**Causes:**
- Redis was restarted (sessions are ephemeral)
- Session TTL expired
- Session was already published or deleted

**Solutions:**

1. **Create a new session:**
   ```bash
   curl -X POST http://localhost:3000/api/ingest \
     -H "Content-Type: application/json" \
     -d '{"sourceType": "manual", ...}'
   ```

2. **Check session expiry (default: 24 hours)**

3. **List all sessions:**
   ```bash
   curl http://localhost:3000/api/sessions \
     -H "X-User-ID: you@example.com"
   ```

### Chunking Timeout

**Symptoms:**
```
Error: LLM chunking timeout after 60000ms
```

**Solutions:**

1. **Increase timeout in `.env`:**
   ```bash
   LLM_CHUNKING_TIMEOUT=120000  # 2 minutes
   ```

2. **Reduce content length:**
   - Split large documents into smaller pieces
   - Use `LLM_CHUNKING_MAX_CONTENT_LENGTH`

3. **Retry the request:**
   - OpenAI may be experiencing high load
   - Check [status.openai.com](https://status.openai.com/)

### OpenAI Rate Limit Exceeded

**Symptoms:**
```
Error: Rate limit exceeded for model gpt-4o
```

**Solutions:**

1. **Wait and retry:**
   - OpenAI has per-minute and per-day limits
   - Wait 60 seconds and retry

2. **Check your OpenAI usage:**
   - Log in to [platform.openai.com](https://platform.openai.com/)
   - Check Usage dashboard
   - Upgrade plan if needed

3. **Reduce batch size:**
   ```bash
   LLM_EMBEDDING_BATCH_SIZE=50  # Lower batch size
   ```

4. **Implement retry logic in your client:**
   - The backend already retries (see `LLM_CHUNKING_MAX_RETRIES`)

### Collection Not Found

**Symptoms:**
```
Error: Collection with ID 550e8400-e29b-41d4-a716-446655440000 not found
```

**Solutions:**

1. **List all collections:**
   ```bash
   curl http://localhost:3000/api/collections \
     -H "X-User-ID: you@example.com"
   ```

2. **Verify collection ID:**
   - Copy the exact UUID from the collection creation response
   - UUIDs are case-sensitive

3. **Create collection if missing:**
   ```bash
   curl -X POST http://localhost:3000/api/collections \
     -H "Content-Type: application/json" \
     -d '{"name": "My Collection", ...}'
   ```

## Docker Issues

### Containers Keep Restarting

**Symptoms:**
```
docker compose ps
NAME               STATUS
backend-redis-1    Restarting (1) 5 seconds ago
```

**Solutions:**

1. **Check container logs:**
   ```bash
   docker compose logs redis
   ```

2. **Remove and recreate containers:**
   ```bash
   docker compose down
   docker compose up -d redis qdrant
   ```

3. **Check disk space:**
   ```bash
   df -h
   ```

4. **Verify Docker is running:**
   ```bash
   docker info
   ```

### Persistent Data Loss

**Symptoms:**
- Collections disappear after restarting Qdrant
- Published chunks are missing

**Solutions:**

1. **Check Qdrant volume mapping:**
   ```yaml
   # In docker-compose.yml
   qdrant:
     volumes:
       - ./qdrant_data:/qdrant/storage
   ```

2. **Verify data directory exists:**
   ```bash
   ls -la backend/qdrant_data
   ```

3. **Set correct permissions:**
   ```bash
   sudo chown -R $(whoami) backend/qdrant_data
   ```

4. **Backup important data:**
   - Export collections before major changes
   - Use Qdrant snapshots for production

### Out of Memory Errors

**Symptoms:**
```
Error: JavaScript heap out of memory
```

**Solutions:**

1. **Increase Node.js memory limit:**
   ```bash
   # In package.json scripts
   "start:dev": "NODE_OPTIONS=--max-old-space-size=4096 nest start --watch"
   ```

2. **Reduce batch sizes:**
   ```bash
   LLM_EMBEDDING_BATCH_SIZE=50
   LLM_CHUNKING_MAX_CONTENT_LENGTH=20000
   ```

3. **Increase Docker memory:**
   - Open Docker Desktop → Settings → Resources
   - Increase Memory limit (e.g., 4GB → 8GB)

## API Errors

### 401 Unauthorized

**Symptoms:**
```
{
  "statusCode": 401,
  "message": "Missing required header: X-User-ID"
}
```

**Solutions:**

1. **Add required headers:**
   ```bash
   curl http://localhost:3000/api/collections \
     -H "X-User-ID: you@example.com" \
     -H "X-User-Role: DEV"
   ```

2. **Check header names (case-sensitive):**
   - `X-User-ID` (not `x-user-id`)
   - `X-User-Role` (not `x-user-role`)

### 403 Forbidden

**Symptoms:**
```
{
  "statusCode": 403,
  "message": "Insufficient permissions for this operation"
}
```

**Solutions:**

1. **Check your role:**
   - L2 Support cannot split/merge chunks
   - L2 Support cannot create collections

2. **Use correct role header:**
   ```bash
   X-User-Role: DEV  # or ML
   ```

3. **See [Roles Documentation](/docs/product/roles) for permissions matrix**

### 429 Too Many Requests

**Symptoms:**
```
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

**Solutions:**

1. **Wait and retry:**
   - Default: 100 requests per minute
   - Wait 60 seconds before retrying

2. **Increase rate limits in `.env`:**
   ```bash
   THROTTLE_LIMIT=1000  # Higher limit
   ```

3. **Disable rate limiting (development only):**
   ```bash
   THROTTLE_LIMIT=999999
   ```

## Logging and Debugging

### Enable Debug Logging

```bash
# In .env
NODE_ENV=development
LOG_LEVEL=debug
```

### View Backend Logs

```bash
# Development mode (terminal output)
cd backend
pnpm start:dev

# Docker containers
docker compose logs -f backend
```

### View Infrastructure Logs

```bash
# Redis logs
docker compose logs redis

# Qdrant logs
docker compose logs qdrant
```

### Health Check Endpoints

```bash
# API health
curl http://localhost:3000/health/live

# Readiness check (includes dependencies)
curl http://localhost:3000/health/ready
```

## Getting Help

If you're still experiencing issues:

1. **Check the logs:**
   - Backend API logs
   - Redis logs (`docker compose logs redis`)
   - Qdrant logs (`docker compose logs qdrant`)

2. **Search GitHub Issues:**
   - [github.com/ragler-oss/ragler/issues](https://github.com/ragler-oss/ragler/issues)

3. **Create a new issue:**
   - Include error messages
   - Include logs
   - Include your environment (OS, Node version, Docker version)
   - Include steps to reproduce

4. **Join the community:**
   - GitHub Discussions (coming soon)
   - Discord (coming soon)

## Related Documentation

- [Installation Guide](./installation.md) — Setup instructions
- [Configuration Guide](./configuration.md) — Environment variables
- [Architecture Overview](/docs/architecture/overview) — System design
- [Observability Guide](/docs/architecture/observability) — Logging and metrics
