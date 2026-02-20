# Changelog

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
