# Changelog

## 1.2.0

### Minor Changes

- 4aa14cb: Add E2E test infrastructure with testcontainers

  - Add testcontainers for Redis and Qdrant (isolated test environment)
  - Create reusable test setup/teardown utilities
  - Add E2E tests for ingest, session lifecycle, collections, and health endpoints
  - Create mocks for jsdom and @mozilla/readability to resolve ESM compatibility issues
  - Configure jest-e2e.json with module path aliases and extended timeout

- feat(mcp): add insert_chunks and ingest_material tools

  Two new MCP tools for RAG content ingestion:

  - `insert_chunks`: direct chunk insertion with atomic replacement, embedding generation, and Qdrant upsert
  - `ingest_material`: standard pipeline ingestion (web/manual/file) creating sessions for user review

- c20bbb0: Add session delete functionality

  - Add DELETE /session/:id endpoint to allow users to delete draft sessions
  - Sessions in DRAFT or PREVIEW status can be deleted
  - Published sessions cannot be deleted (they are already removed after publish)
  - Frontend SessionList now includes delete button with confirmation dialog

- 63695f9: Add WebStrategy for URL content ingestion

  - Implement WebStrategy to fetch and extract content from web URLs using Mozilla Readability
  - Add URL validation with SSRF protection (blocks private IPs, localhost)
  - Add configurable timeout, user-agent, and max content length settings
  - Add custom error classes (UrlValidationError, FetchError, ContentExtractionError) with retry classification
  - Add structured logging for observability (ingest_start, ingest_success, ingest_failure events)

- e760f1e: Add production readiness features

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

### Patch Changes

- f07f5f8: Add comprehensive README with Quick Start guide, API reference, and development documentation
- 6a81fa9: Add unit tests for collection, ingest, and llm modules

All notable backend changes are documented here.

## 1.1.0

### What changed

- Added collection editor backend APIs for direct chunk management.
- Added collection agent endpoints for AI-assisted analysis and operation suggestions.
- Expanded collection/vector DTOs for richer metadata and quality controls.
- Added unit test coverage for chunk service operations.

### Verify

- Swagger includes `Collection Editor - Chunks`, `Collection Editor - Reorder`, and `Collection Agent` sections.
- `GET /api/health/readiness` reports healthy dependencies.

## 1.0.0

### What changed

- Initial backend release with ingestion, session workflow, collection CRUD, and search.

### Verify

- Core flow works: ingest -> session edit -> preview -> publish -> search.
