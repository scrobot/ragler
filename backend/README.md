# RAGler Backend

NestJS API for ingestion, draft editing, publishing, and search.

## TL;DR

```bash
pnpm install
cp .env.example .env
docker compose up -d redis qdrant
pnpm start:dev
```

API base URL: `http://localhost:3000/api`

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- Docker
- OpenAI API key

### Steps

1. Install dependencies.

```bash
pnpm install
```

2. Configure environment.

```bash
cp .env.example .env
```

3. Start dependencies.

```bash
docker compose up -d redis qdrant
```

4. Start server.

```bash
pnpm start:dev
```

## Configuration

Required:

- `REDIS_HOST`
- `QDRANT_URL`
- `OPENAI_API_KEY`

Common optional:

- `PORT` (default `3000`)
- `REDIS_PORT` (default `6379`)
- `THROTTLE_TTL` (default `60000`)
- `THROTTLE_LIMIT` (default `100`)
- `SESSION_TTL` (default `86400`)
- `WEB_FETCH_TIMEOUT` (default `30000`)
- `CONFLUENCE_*` (required only for Confluence ingest)

## Run and Verify

```bash
curl http://localhost:3000/api/health/liveness
curl http://localhost:3000/api/health/readiness
```

Swagger:

- `http://localhost:3000/api/docs`

## Main Endpoints

- `POST /api/ingest/confluence`
- `POST /api/ingest/web`
- `POST /api/ingest/manual`
- `GET /api/session`
- `GET /api/session/:id`
- `POST /api/session/:id/chunks`
- `POST /api/session/:id/chunks/merge`
- `POST /api/session/:id/chunks/:chunkId/split`
- `PATCH /api/session/:id/chunks/:chunkId`
- `POST /api/session/:id/preview`
- `POST /api/session/:id/publish`
- `DELETE /api/session/:id`
- `GET/POST/DELETE /api/collections...`
- `POST /api/search`

Collection editor endpoints:

- `GET/POST /api/collections/:collectionId/chunks`
- `PUT/DELETE /api/collections/:collectionId/chunks/:chunkId`
- `POST /api/collections/:collectionId/chunks/:chunkId/split`
- `POST /api/collections/:collectionId/chunks/merge`
- `PUT /api/collections/:collectionId/reorder`
- `POST /api/collections/:collectionId/agent/chat`

## Common Tasks

```bash
pnpm test
pnpm test:e2e
pnpm lint
pnpm typecheck
pnpm build
pnpm start:prod
```

## Troubleshooting

- Env validation errors at startup: review `backend/src/config/env.schema.ts`.
- Readiness failures: check `QDRANT_URL` and Redis host/port.
- Slow ingest: verify OpenAI connectivity and timeout settings.
