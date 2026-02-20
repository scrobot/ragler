---
sidebar_position: 1
---

# RAGler Documentation

## What this page is for

Start here to install RAGler, run the main ingest-to-publish flow, and navigate deeper product and architecture docs.

## Prerequisites

- Node.js 20+
- pnpm
- Docker
- OpenAI API key

## Steps

1. Install backend dependencies and configure environment.
2. Start Redis and Qdrant.
3. Start backend API and open Swagger.
4. Run your first collection workflow.

## Verify

- API liveness: `GET http://localhost:3000/api/health/liveness`
- API docs: `http://localhost:3000/api/docs`
- Readiness includes Redis and Qdrant.

## Next steps

1. `/docs/getting-started/installation`
2. `/docs/getting-started/configuration`
3. `/docs/getting-started/first-collection`
