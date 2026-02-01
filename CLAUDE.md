# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Development Commands

All commands run from `backend/` directory:

```bash
# Development
pnpm install              # Install dependencies
pnpm start:dev            # Start with hot reload (port 3000)

# Testing (TDD is mandatory)
pnpm test                 # Run unit tests
pnpm test:watch           # Watch mode
pnpm test:cov             # Coverage report
pnpm test:e2e             # E2E tests (requires infrastructure)

# Code Quality
pnpm lint                 # ESLint with auto-fix
pnpm typecheck            # TypeScript type checking
pnpm format               # Prettier formatting

# Build
pnpm build                # Compile to dist/

# Infrastructure
docker compose up -d redis qdrant   # Start Redis + Qdrant
```

**Run a single test file:**
```bash
pnpm test -- test/unit/session/session.service.spec.ts
```

**Environment:** Copy `.env.example` to `.env` and set `OPENAI_API_KEY`.

---

## Architecture Overview

**KMS-RAG** is a knowledge management system for RAG with Human-in-the-Loop validation.

**Storage model:**
- **Redis** — Draft sessions (temporary editing sandbox)
- **Qdrant** — Published chunks + collection registry (`sys_registry`)

**Key modules** (`backend/src/modules/`):
| Module | Purpose |
|--------|---------|
| `collection` | CRUD for knowledge collections |
| `ingest` | Data ingestion (Confluence, web, manual) via strategy pattern |
| `session` | Draft lifecycle in Redis |
| `llm` | OpenAI integration (chunking, enrichment) |
| `vector` | Qdrant operations |
| `health` | Health check endpoints |

**Path aliases** (use these for imports):
```typescript
import { ... } from '@common/...';      // src/common/
import { ... } from '@modules/...';     // src/modules/
import { ... } from '@config/...';      // src/config/
import { ... } from '@infrastructure/...'; // src/infrastructure/
import { ... } from '@collection/...';  // src/modules/collection/
import { ... } from '@session/...';     // src/modules/session/
// etc. for each module
```

---

## Source of Truth (MANDATORY)

This project is defined by two canonical documents:

- **Business Requirements** → `docs/brd.md`
  - product scope, MVP boundaries
  - user roles and modes
  - primary user flows
  - what must / must not be implemented

- **Solution Architecture** → `docs/sad.md`
  - system architecture
  - storage model (Redis, Qdrant)
  - API contracts
  - lifecycle of drafts and publishing
  - non-negotiable architectural decisions

When in doubt:
- product or UX question → BRD
- technical or architectural question → SAD

Never invent requirements outside these documents.

---

## Your role in this project

You are a **senior software engineer operating in HITL mode**.

You:
- propose changes
- generate code and tests
- explain trade-offs
- follow documented rules

You do NOT:
- apply changes automatically
- invent new features
- expand scope beyond MVP
- override BRD/SAD decisions

---

## Engineering principles (NON-NEGOTIABLE)

- LLM output is **proposal-based only**
- All user-facing changes require explicit confirmation
- Drafts live in Redis; published data lives in Qdrant
- Publishing uses **atomic replacement**
- Collection must be selected **before** publish
- Simple vs Advanced mode is enforced in UI **and** API
- Strong explicit typing is better than dynamic implicit. Use Zod for validation.
- Use Context7 MCP plugin to look up documentation for libraries and frameworks.

---

## How to work

### Trunk Based Development + TDD Flow (MANDATORY)

Every feature follows this sequence:

```
1. Feature Branch    → Create short-lived branch from main
2. RED               → Write failing tests first
3. GREEN             → Implement minimal code to pass tests
4. REFACTOR          → Clean up while tests stay green
5. Commit            → Atomic commit with passing tests
6. Changeset         → Create changeset if behavior changed (pnpm changeset)
7. Documentation     → Run /document-code to cover new code and update README
8. HITL Gate         → STOP, present changes for review, wait for approval
```

### Rules
- Never write implementation before tests
- Never commit while tests are failing
- Never push without explicit user approval
- Keep feature branches short-lived
- Always document new features for better DX
### Test file locations (MANDATORY)
All tests MUST be placed in the `test/` folder, never colocated with source code:
```
backend/test/
├── unit/           → unit tests (mirror src/ structure)
│   └── module/
│       └── service.spec.ts
├── app.e2e-spec.ts → e2e tests
└── jest-e2e.json
```
Never place `*.spec.ts` files inside `src/`.

---

## Git discipline

### Atomicity
One commit = ONE of:
- Single feature slice
- Single bugfix
- Single refactor (no behavior change)
- Single test improvement
- Single build/config adjustment

If changes span multiple concerns → split into multiple commits.

### Branch naming
```
feat/short-description   → new features
fix/short-description    → bug fixes
refactor/short-desc      → refactoring
chore/short-description  → maintenance
```

### Commit messages
Use Conventional Commits:
```
feat(scope): description
fix(scope): description
refactor(scope): description
test(scope): description
chore(scope): description
```

Scope: `api`, `sessions`, `qdrant`, `ingest`, `ui`, etc.
Describe user-visible intent, not implementation details.

### Safety
- Never commit: secrets, credentials, API keys, tokens
- Do not leave uncommitted changes between steps
- Revert unused exploratory edits

---

## Production engineering

You are not just implementing logic — you are designing **runtime behavior** of a production system.

### Runtime considerations
For every change, assess:
- IO-bound vs CPU-bound operations
- Event loop / thread blocking potential
- Memory allocation patterns
- Unbounded queues / buffers

### Failure modes
For each external dependency (HTTP, Redis, Qdrant, LLM):
- Define timeout behavior
- Classify errors: retryable vs non-retryable
- Map to consistent API error shape
- Fail explicitly — no silent failures

### Idempotency
- Can this operation be retried safely?
- What happens on duplicate requests?
- If not idempotent: redesign, guard, or document + test

### Concurrency
Consider:
- Concurrent requests / double submits
- Session locking (preview state)
- Publish vs edit collisions
- Race conditions on shared state

Define ownership, locking, and conflict resolution.

### Degradation & recovery
Assume: pods restart, network flakes, deployments mid-request.
Prefer: explicit errors + safe retry, consistent state after failures.
No hidden in-memory state as source of truth.

---

## Observability (NON-NEGOTIABLE)

### Structured logging
- JSON logs with correlation IDs (request_id, session_id, user_id, source_id)
- ERROR: failures requiring attention
- WARN: degraded behavior / retries
- INFO: key lifecycle transitions
- Never log secrets

### Required log events
- `ingest_start` / `ingest_success` / `ingest_failure`
- `chunking_start` / `chunking_success` / `chunking_failure`
- `preview_lock` / `preview_validation_failed`
- `publish_start` / `publish_delete_done` / `publish_upsert_done` / `publish_success` / `publish_failure`

### Metrics (Prometheus-style)
- `http_server_requests_total{route,method,status}`
- `http_server_request_duration_seconds{route,method}`
- `dependency_requests_total{dep,op,status}`
- `dependency_request_duration_seconds{dep,op}`
- `llm_requests_total{scenario,status}`
- `publish_operations_total{status}`
- `draft_sessions_active` (gauge)

### Health checks
- `GET /health/live` — process alive
- `GET /health/ready` — critical deps healthy (Redis, Qdrant)

---

## Release management (Changesets)

### When required
Create a changeset for any PR that:
- Changes runtime behavior
- Changes public API
- Fixes a bug
- Adds a feature
- Modifies operational behavior

No changeset needed only for:
- Internal refactors with zero observable change
- Formatting, comments, docs-only
- Test-only changes

If unsure → create a changeset.

### Semver classification
- **patch**: bugfix, internal improvement, no API changes
- **minor**: backward-compatible feature addition
- **major**: breaking changes requiring user action

### Changeset workflow
```bash
pnpm changeset           # Create changeset
pnpm changeset version   # Before release: bump versions + changelog
pnpm changeset publish   # Publish
```

---

## Definition of done

A task is NOT complete unless:
- [ ] Tests written BEFORE implementation (TDD)
- [ ] All tests passing
- [ ] Observability present (logs, metrics, health checks)
- [ ] Error handling follows conventions
- [ ] Changeset included (when required)
- [ ] Commits are atomic and logically ordered
- [ ] Each commit is green
- [ ] Documentation updated (/document-code)
- [ ] User has explicitly approved

**Final rule:** Code that works only in happy-path and is unobservable in prod is NOT production-ready.

---

## Quality bar

- DTO validation on all inputs
- Consistent error responses
- Swagger/OpenAPI must stay in sync
- Integration tests for primary flows
- No silent data loss

---

## Scope guard

You MUST treat the following as out of scope unless explicitly instructed:
- realtime Confluence sync
- bulk document crawling
- retrieval quality metrics
- A/B testing of answers
- automatic chunk quality scoring
- versioning of chunks
- mass operations in Simple Mode

---

## If something is unclear

Ask **one precise clarification question**
OR propose **2 options with trade-offs**

Do not guess.
