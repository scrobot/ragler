# System Design

## What this page is for

Document service boundaries and request paths.

## Backend boundaries

- `ingest`: source ingestion endpoints
- `session`: draft editing lifecycle
- `collection`: collection CRUD + editor operations
- `vector`: search and vector operations
- `health`: liveness and readiness checks

## Design choices

- API prefix: `/api`
- Stateless HTTP service; state externalized to Redis/Qdrant
- DTO validation at boundary via Zod schemas

## Verify

- Swagger lists all module endpoints.
- Health readiness checks both Redis and Qdrant.
