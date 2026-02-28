# RAGler

RAGler is an open-source RAG knowledge operations platform.

## TL;DR

- Ingest knowledge from Confluence, web pages, or manual text.
- Review and edit chunks in a draft session.
- Publish validated chunks to Qdrant collections.
- Query published knowledge from the backend API or MCP server.

## Demo

<p align="center">
  <img src="demo.webp" alt="RAGler Demo — walkthrough of dashboard, collections, ingestion, sessions, chat, and settings" width="800" />
</p>

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- Docker
- OpenAI API key

### 1. Start infrastructure

```bash
docker compose up -d redis qdrant
```

### 2. Start backend

```bash
cd backend
pnpm install
cp .env.example .env
# set OPENAI_API_KEY in .env
pnpm start:dev
```

### 3. Verify backend

```bash
curl http://localhost:3000/api/health/liveness
curl http://localhost:3000/api/health/readiness
```

Expected liveness response:

```json
{"status":"ok"}
```

### 4. (Optional) Start frontend

```bash
cd ../frontend
pnpm install
pnpm dev
```

### 5. (Optional) Start MCP server

```bash
cd ../mcp-server
pnpm install
pnpm build
pnpm start
```

## Configuration

Backend runtime is driven by `backend/.env`. Core variables:

- `OPENAI_API_KEY` (required)
- `REDIS_HOST` (required)
- `REDIS_PORT` (default `6379`)
- `QDRANT_URL` (required)
- `PORT` (default `3000`)
- `SESSION_TTL` (default `86400`)

## Run and Verify Core Flow

### 1. Create a collection

```bash
curl -X POST http://localhost:3000/api/collections \
  -H 'Content-Type: application/json' \
  -H 'X-User-ID: demo@ragler.ai' \
  -d '{"name":"Support KB","description":"Support knowledge"}'
```

### 2. Start manual ingest

```bash
curl -X POST http://localhost:3000/api/ingest/manual \
  -H 'Content-Type: application/json' \
  -H 'X-User-ID: demo@ragler.ai' \
  -d '{"content":"RAGler stores draft sessions in Redis and publishes to Qdrant."}'
```

### 3. Review session and publish

```bash
curl http://localhost:3000/api/session/<SESSION_ID> -H 'X-User-ID: demo@ragler.ai'
curl -X POST http://localhost:3000/api/session/<SESSION_ID>/preview -H 'X-User-ID: demo@ragler.ai'
curl -X POST http://localhost:3000/api/session/<SESSION_ID>/publish \
  -H 'Content-Type: application/json' \
  -H 'X-User-ID: demo@ragler.ai' \
  -d '{"targetCollectionId":"<COLLECTION_ID>"}'
```

## Docs

- Product docs: `docs/docs`
- Specs: `specs/`
- Backend API Swagger: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

## Troubleshooting

- `readiness` fails: check Redis/Qdrant containers with `docker compose ps`.
- `401/403` style behavior in clients: confirm `X-User-ID` header is present.
- Ingest failures: confirm `OPENAI_API_KEY` and outbound connectivity.

## Next Steps

1. Read `/Users/alex/ragler/docs/docs/getting-started/installation.md`.
2. Walk through `/Users/alex/ragler/docs/docs/getting-started/first-collection.md`.
3. Review architecture in `/Users/alex/ragler/docs/docs/architecture/overview.md`.
