# Architecture Overview

## What this page is for

Describe the runtime architecture and data flow used by RAGler.

## High-level components

- Frontend (Next.js)
- Backend API (NestJS)
- Redis (draft sessions)
- Qdrant (published vectors + metadata)
- OpenAI (chunking/embedding/model tasks)
- MCP server (tool adapter over backend API)

## Data flow

1. Source content enters via ingest endpoint.
2. Draft session and chunk edits live in Redis.
3. Publish writes embeddings and chunk payloads to Qdrant.
4. Search queries Qdrant and returns structured results.

## Next steps

- `/docs/architecture/system-design`
- `/docs/architecture/data-model`
