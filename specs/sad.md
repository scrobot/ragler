# Solution Architecture Document (SAD)

## Purpose

Define how RAGler is implemented across services, storage, and integrations.

## Architecture Summary

- Frontend: Next.js UI
- Backend: NestJS API (`/api`)
- Draft store: Redis
- Published store: Qdrant
- Model provider: OpenAI
- MCP adapter: standalone Node.js server

## System Boundaries

- Backend is the single write/read API for product operations.
- MCP server does not bypass backend.
- Search operates on published content only.

## Core Decisions

- Store drafts in Redis with TTL.
- Store published vectors + metadata in Qdrant.
- Use publish replacement semantics to avoid stale chunk artifacts.
- Separate LLM responsibilities by operation type where practical.

## Data Flow

1. Ingest endpoint receives source.
2. Session module manages draft chunks.
3. Publish commits to Qdrant.
4. Search reads from Qdrant.
5. Collection editor modifies published chunks directly.

## Public Interfaces

- Ingest: `/api/ingest/*`
- Session: `/api/session/*`
- Collections: `/api/collections/*`
- Search: `/api/search`
- Health: `/api/health/*`
- Collection agent: `/api/collections/:collectionId/agent/*`

## Risks and Mitigations

- External dependency failures (OpenAI/Qdrant/Redis): health checks + retries/timeouts.
- Stale published data: replacement-oriented publish strategy.
- Header-based identity limitations: deploy behind trusted gateway.
