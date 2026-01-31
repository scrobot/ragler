---
trigger: always_on
glob:
description: Core engineering rules for implementation verification
---

# Core Engineering Verification Guide

Use this checklist to verify implementations comply with project standards.

---

## Code Quality Checks

### Typing & Validation
- [ ] Strong explicit typing used (no `any`, no implicit types)
- [ ] Zod schemas for all external inputs (DTOs, API payloads)
- [ ] DTO validation on all controller inputs

### Error Handling
- [ ] No silent failures — all errors explicitly handled
- [ ] Errors mapped to consistent API error shape
- [ ] Errors classified: retryable vs non-retryable
- [ ] Timeouts defined for external dependencies (HTTP, Redis, Qdrant, LLM)

### Idempotency & Concurrency
- [ ] Operations safe to retry (or documented if not)
- [ ] Race conditions considered (concurrent requests, double submits)
- [ ] Session locking handled where needed
- [ ] No hidden in-memory state as source of truth

---

## Test Verification

### Location
- [ ] All `*.spec.ts` files in `test/` folder (never in `src/`)
- [ ] Unit tests in `test/unit/` mirroring `src/` structure
- [ ] E2E tests in `test/` root

### Coverage
- [ ] Tests written BEFORE implementation (TDD)
- [ ] All tests passing
- [ ] Integration tests for primary flows
- [ ] Edge cases and error paths covered

---

## Observability Checks

### Logging
- [ ] Structured JSON logs with correlation IDs
- [ ] Appropriate log levels (ERROR/WARN/INFO)
- [ ] No secrets in logs
- [ ] Required events logged:
  - `ingest_start` / `ingest_success` / `ingest_failure`
  - `chunking_start` / `chunking_success` / `chunking_failure`
  - `preview_lock` / `preview_validation_failed`
  - `publish_start` / `publish_delete_done` / `publish_upsert_done` / `publish_success` / `publish_failure`

### Metrics
- [ ] HTTP request metrics exposed
- [ ] Dependency request metrics exposed
- [ ] Business operation metrics (publish, LLM calls)

### Health
- [ ] `/health/live` endpoint working
- [ ] `/health/ready` checks critical deps (Redis, Qdrant)

---

## API Checks

- [ ] Swagger/OpenAPI documentation in sync with implementation
- [ ] Consistent error response format
- [ ] Simple vs Advanced mode enforced in API

---

## Git & Release Checks

### Commits
- [ ] Atomic commits (one concern per commit)
- [ ] Conventional commit messages (`feat`, `fix`, `refactor`, `test`, `chore`)
- [ ] No secrets committed
- [ ] Each commit is green (tests pass)

### Changesets
- [ ] Changeset created if behavior changed
- [ ] Correct semver classification (patch/minor/major)
- [ ] User impact described

---

## Architecture Compliance

### Storage Model
- [ ] Drafts stored in Redis
- [ ] Published data stored in Qdrant
- [ ] Publishing uses atomic replacement
- [ ] Collection selected before publish

### Runtime
- [ ] IO-bound vs CPU-bound operations assessed
- [ ] Event loop blocking avoided
- [ ] No unbounded queues/buffers
- [ ] Graceful degradation on dependency failures

---

## Scope Guard

Reject implementations that include (unless explicitly instructed):
- Realtime Confluence sync
- Bulk document crawling
- Retrieval quality metrics
- A/B testing of answers
- Automatic chunk quality scoring
- Versioning of chunks
- Mass operations in Simple Mode