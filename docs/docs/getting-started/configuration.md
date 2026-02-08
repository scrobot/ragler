---
sidebar_position: 2
title: Configuration
---

# Configuration Guide

This guide covers all configuration options for RAGler, including environment variables, service connections, and optional features.

## Environment Variables

RAGler uses environment variables for configuration. Copy `.env.example` to `.env` in the backend directory and customize as needed.

```bash
cd backend
cp .env.example .env
```

## Core Configuration

### Server Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Backend API server port | `3000` | No |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `development` | No |

**Example:**
```bash
PORT=3000
NODE_ENV=development
```

### Redis Configuration

Redis is used for storing draft sessions (ephemeral editing sandbox).

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_HOST` | Redis server hostname | `localhost` | Yes |
| `REDIS_PORT` | Redis server port | `6379` | Yes |

**Example:**
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Docker Setup:**
If using Docker Compose, Redis is automatically configured at `localhost:6379`:

```bash
docker compose up -d redis
```

**Remote Redis:**
To connect to a remote Redis instance:

```bash
REDIS_HOST=redis.example.com
REDIS_PORT=6379
```

### Qdrant Configuration

Qdrant is the vector database for storing published chunks and collections.

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `QDRANT_URL` | Qdrant connection URL | `http://localhost:6333` | Yes |

**Example:**
```bash
QDRANT_URL=http://localhost:6333
```

**Docker Setup:**
```bash
docker compose up -d qdrant
```

**Remote Qdrant:**
```bash
QDRANT_URL=https://your-qdrant-cloud.example.com
```

**Qdrant Cloud:**
If using Qdrant Cloud, use the provided cluster URL:

```bash
QDRANT_URL=https://xyz-example.aws.cloud.qdrant.io
# Add authentication if required by your Qdrant setup
```

### OpenAI Configuration

RAGler uses OpenAI for:
- **Chunking** (GPT-4o) — Splitting documents into semantic chunks
- **Enrichment** (GPT-4o-mini) — Adding context and clarifying content
- **Embeddings** (text-embedding-3-small) — Generating vectors for search

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | **Yes** |

**How to get an OpenAI API key:**

1. Sign up at [platform.openai.com](https://platform.openai.com/)
2. Navigate to **API Keys** in your account settings
3. Create a new API key
4. Add it to your `.env` file:

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Cost Considerations:**

RAGler uses the "Two LLMs" pattern:
- **GPT-4o** for chunking (more expensive, high quality)
- **GPT-4o-mini** for enrichment (cheaper, fast)

Estimated costs per 1000 documents (~5 pages each):
- Chunking: ~$2-5 (GPT-4o)
- Enrichment: ~$0.50-1 (GPT-4o-mini)
- Embeddings: ~$0.10-0.20 (text-embedding-3-small)

See [OpenAI Pricing](https://openai.com/pricing) for current rates.

## Optional Configuration

### Rate Limiting

Control API request throttling to prevent abuse:

| Variable | Description | Default |
|----------|-------------|---------|
| `THROTTLE_TTL` | Time window for rate limiting (milliseconds) | `60000` (1 minute) |
| `THROTTLE_LIMIT` | Maximum requests per time window | `100` |

**Example:**
```bash
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

To disable rate limiting (not recommended for production):
```bash
THROTTLE_LIMIT=999999
```

### Confluence Integration

For ingesting content from Atlassian Confluence:

| Variable | Description | Required |
|----------|-------------|----------|
| `CONFLUENCE_BASE_URL` | Your Confluence instance URL | Only for Confluence sources |
| `CONFLUENCE_USER_EMAIL` | Confluence user email | Only for Confluence sources |
| `CONFLUENCE_API_TOKEN` | Confluence API token | Only for Confluence sources |
| `CONFLUENCE_FETCH_TIMEOUT` | Timeout for Confluence API calls (ms) | No (default: 30000) |

**How to set up Confluence integration:**

1. **Get your Confluence URL:**
   ```bash
   CONFLUENCE_BASE_URL=https://your-domain.atlassian.net
   ```

2. **Create an API token:**
   - Go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
   - Click **Create API token**
   - Copy the token

3. **Configure in `.env`:**
   ```bash
   CONFLUENCE_BASE_URL=https://your-domain.atlassian.net
   CONFLUENCE_USER_EMAIL=your-email@example.com
   CONFLUENCE_API_TOKEN=your-confluence-api-token-here
   CONFLUENCE_FETCH_TIMEOUT=30000
   ```

**Note:** Confluence integration is **only required if you plan to ingest content from Confluence**. Web and manual ingestion work without this configuration.

### LLM Chunking Configuration

Fine-tune the chunking process:

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_CHUNKING_TIMEOUT` | Timeout for chunking requests (ms) | `60000` |
| `LLM_CHUNKING_MAX_RETRIES` | Max retry attempts on failure | `2` |
| `LLM_CHUNKING_MAX_CONTENT_LENGTH` | Max characters per document | `30000` |

**Example:**
```bash
LLM_CHUNKING_TIMEOUT=60000
LLM_CHUNKING_MAX_RETRIES=2
LLM_CHUNKING_MAX_CONTENT_LENGTH=30000
```

**Use Cases:**
- Increase `TIMEOUT` for large documents (>20 pages)
- Decrease `MAX_CONTENT_LENGTH` to chunk very large documents in batches
- Adjust `MAX_RETRIES` for unreliable network conditions

### LLM Embedding Configuration

Configure the embedding (vectorization) process:

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_EMBEDDING_TIMEOUT` | Timeout for embedding requests (ms) | `30000` |
| `LLM_EMBEDDING_MAX_RETRIES` | Max retry attempts on failure | `2` |
| `LLM_EMBEDDING_BATCH_SIZE` | Chunks to embed per API call | `100` |

**Example:**
```bash
LLM_EMBEDDING_TIMEOUT=30000
LLM_EMBEDDING_MAX_RETRIES=2
LLM_EMBEDDING_BATCH_SIZE=100
```

**Performance Tips:**
- Increase `BATCH_SIZE` (up to 2048 per OpenAI limits) for faster processing
- Decrease `BATCH_SIZE` if you encounter rate limits or timeout errors

## Docker Compose Configuration

The `docker-compose.yml` file in the `backend/` directory configures infrastructure services.

### Basic Docker Compose

```yaml
version: '3.8'

services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    command: redis-server --save 60 1 --loglevel warning

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - ./qdrant_data:/qdrant/storage
```

### Custom Docker Compose

To customize infrastructure, edit `docker-compose.yml`:

**Persistent Redis:**
```yaml
redis:
  volumes:
    - ./redis_data:/data
  command: redis-server --appendonly yes
```

**Qdrant with Authentication:**
```yaml
qdrant:
  environment:
    - QDRANT__SERVICE__API_KEY=your-secret-key
```

## Health Checks

Verify that your configuration is correct by checking the health endpoints:

```bash
# Backend API health
curl http://localhost:3000/health/live

# Readiness check (includes Redis and Qdrant connectivity)
curl http://localhost:3000/health/ready
```

**Expected responses:**

- **Live:** `{"status":"ok"}` — API server is running
- **Ready:**
  ```json
  {
    "status": "ok",
    "info": {
      "redis": { "status": "up" },
      "qdrant": { "status": "up" }
    }
  }
  ```

## Production Configuration

For production deployments, adjust these settings:

### 1. Set Production Environment

```bash
NODE_ENV=production
```

### 2. Secure Secrets

**Do NOT commit `.env` files to version control.**

Use environment variable injection:
- Docker secrets
- Kubernetes ConfigMaps/Secrets
- AWS Parameter Store / Secrets Manager
- Azure Key Vault
- Environment variable management tools (Doppler, Vault)

### 3. Adjust Rate Limits

```bash
THROTTLE_TTL=60000      # 1 minute window
THROTTLE_LIMIT=1000     # Higher limit for production
```

### 4. Configure Timeouts

Increase timeouts for production workloads:

```bash
CONFLUENCE_FETCH_TIMEOUT=60000
LLM_CHUNKING_TIMEOUT=120000
LLM_EMBEDDING_TIMEOUT=60000
```

### 5. Enable Observability

Ensure structured logging is enabled (automatic in production mode).

See [Observability Guide](/docs/architecture/observability) for monitoring and logging details.

## Configuration Validation

RAGler validates configuration on startup:

**Missing Required Variables:**
```
Error: Missing required environment variable: OPENAI_API_KEY
```

**Invalid Values:**
```
Error: QDRANT_URL must be a valid URL
```

**Connection Failures:**
```
Error: Cannot connect to Redis at localhost:6379
Error: Cannot connect to Qdrant at http://localhost:6333
```

If you see these errors, review your `.env` file and ensure services are running.

## Configuration Examples

### Minimal Local Development

```bash
# .env
PORT=3000
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
QDRANT_URL=http://localhost:6333
OPENAI_API_KEY=sk-your-key-here
```

### Production with Confluence

```bash
# .env (production)
PORT=3000
NODE_ENV=production
REDIS_HOST=prod-redis.internal
REDIS_PORT=6379
QDRANT_URL=https://qdrant-cluster.example.com
OPENAI_API_KEY=sk-prod-key-here

# Confluence
CONFLUENCE_BASE_URL=https://company.atlassian.net
CONFLUENCE_USER_EMAIL=service-account@company.com
CONFLUENCE_API_TOKEN=xxxx

# Rate limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=1000

# Timeouts
LLM_CHUNKING_TIMEOUT=120000
LLM_EMBEDDING_TIMEOUT=60000
```

### Docker Compose Full Stack

```bash
# .env (for Docker Compose)
OPENAI_API_KEY=sk-your-key-here

# Services will use container names
REDIS_HOST=redis
QDRANT_URL=http://qdrant:6333
```

## Next Steps

- [Create your first collection](./first-collection.md) — Tutorial walkthrough
- [Troubleshooting](./troubleshooting.md) — Common configuration issues
- [Architecture Overview](/docs/architecture/overview) — Understand the system design
