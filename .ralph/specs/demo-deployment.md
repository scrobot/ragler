# Demo Deployment Specification

## Goal
Enable users to spin up a complete RAGler instance with pre-seeded data in a single `docker compose up` command, providing a short-lived sandbox to explore all features.

## Architecture

```
docker-compose.demo.yml
├── ragler-backend    (NestJS, port 3000)
├── ragler-frontend   (Next.js, port 3001)
├── qdrant            (Vector DB, port 6333)
├── redis             (Session store, port 6379)
└── seed-runner       (One-shot container to populate demo data)
```

## Dockerfiles

### Backend Dockerfile (`backend/Dockerfile`)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Frontend Dockerfile (`frontend/Dockerfile`)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3001
ENV PORT=3001
CMD ["node", "server.js"]
```

## Demo Seed Data

### Collections to pre-create:
1. **"Getting Started with RAGler"** — 5 chunks explaining the platform
2. **"Product FAQ"** — 8 chunks with common Q&A
3. **"Technical Documentation"** — 10 chunks from architecture docs

### Seed Script (`demo/seed.ts`)
- Creates collections via API
- Ingests markdown content via manual ingest endpoint
- Publishes all sessions automatically
- Verifies data with health check

## Environment

### `.env.demo`
```env
PORT=3000
NODE_ENV=demo
REDIS_HOST=redis
REDIS_PORT=6379
QDRANT_URL=http://qdrant:6333
OPENAI_API_KEY=${OPENAI_API_KEY:-demo}
SESSION_TTL=3600  # 1 hour for demo
DEMO_MODE=true
```

## Demo Mode Behavior
When `DEMO_MODE=true`:
- Sessions auto-expire after 1 hour
- Rate limiting is more strict
- Destructive operations show a warning
- A banner shows "Demo Mode — data resets periodically"
- No Confluence integration available (requires real credentials)

## Convenience Commands

### Root `package.json` scripts (or Makefile):
```
demo:up     — Start all demo services
demo:down   — Stop all demo services
demo:seed   — Re-seed demo data
demo:reset  — Reset entire demo environment
demo:logs   — Follow all container logs
```

## One-Click Experience

### DEMO.md
```bash
# Prerequisites: Docker, docker compose, OpenAI API key (optional for LLM features)

# 1. Start everything
OPENAI_API_KEY=sk-... docker compose -f docker-compose.demo.yml up -d

# 2. Wait for health (automated by health checks)
curl http://localhost:3000/api/health/readiness

# 3. Open browser
open http://localhost:3001

# 4. Explore pre-loaded "Getting Started" collection
```

## Health Check Script (`demo/healthcheck.sh`)
```bash
#!/bin/bash
echo "Waiting for services..."
until curl -sf http://localhost:3000/api/health/readiness; do sleep 2; done
echo "✅ Backend ready"
until curl -sf http://localhost:3001; do sleep 2; done
echo "✅ Frontend ready"
echo "🚀 RAGler demo is ready at http://localhost:3001"
```
