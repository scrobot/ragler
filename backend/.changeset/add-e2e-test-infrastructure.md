---
"kms-rag-backend": minor
---

Add E2E test infrastructure with testcontainers

- Add testcontainers for Redis and Qdrant (isolated test environment)
- Create reusable test setup/teardown utilities
- Add E2E tests for ingest, session lifecycle, collections, and health endpoints
- Create mocks for jsdom and @mozilla/readability to resolve ESM compatibility issues
- Configure jest-e2e.json with module path aliases and extended timeout
