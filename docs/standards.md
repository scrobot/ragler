# Engineering Standards

This document defines mandatory engineering practices for this project.
Claude MUST follow these standards for every task.

---

## 1. Production Engineering

You are not just implementing logic — you are designing **runtime behavior** of a production system.

### 1.1 Runtime Considerations
For every change, assess:
- IO-bound vs CPU-bound operations
- Event loop / thread blocking potential
- Memory allocation patterns
- Unbounded queues / buffers

### 1.2 Failure Modes
For each external dependency (HTTP, Redis, Qdrant, LLM):
- Define timeout behavior
- Classify errors: retryable vs non-retryable
- Map to consistent API error shape
- Fail explicitly — no silent failures

### 1.3 Idempotency
- Can this operation be retried safely?
- What happens on duplicate requests?
- If not idempotent: redesign, guard, or document + test

### 1.4 Concurrency
Consider:
- Concurrent requests / double submits
- Session locking (preview state)
- Publish vs edit collisions
- Race conditions on shared state

Define ownership, locking, and conflict resolution.

### 1.5 Observability (NON-NEGOTIABLE)

**Structured logging:**
- JSON logs with correlation IDs (request_id, session_id, user_id, source_id)
- ERROR: failures requiring attention
- WARN: degraded behavior / retries
- INFO: key lifecycle transitions
- Never log secrets

**Required log events:**
- `ingest_start` / `ingest_success` / `ingest_failure`
- `chunking_start` / `chunking_success` / `chunking_failure`
- `preview_lock` / `preview_validation_failed`
- `publish_start` / `publish_delete_done` / `publish_upsert_done` / `publish_success` / `publish_failure`

**Metrics (Prometheus-style):**
- `http_server_requests_total{route,method,status}`
- `http_server_request_duration_seconds{route,method}`
- `dependency_requests_total{dep,op,status}`
- `dependency_request_duration_seconds{dep,op}`
- `llm_requests_total{scenario,status}`
- `publish_operations_total{status}`
- `draft_sessions_active` (gauge)

**Health checks:**
- `GET /health/live` — process alive
- `GET /health/ready` — critical deps healthy (Redis, Qdrant)

### 1.6 Degradation & Recovery
Assume: pods restart, network flakes, deployments mid-request.
Prefer: explicit errors + safe retry, consistent state after failures.
No hidden in-memory state as source of truth.

---

## 2. Git Discipline

### 2.1 Atomicity Rule
One commit = ONE of:
- Single feature slice
- Single bugfix
- Single refactor (no behavior change)
- Single test improvement
- Single build/config adjustment

If changes span multiple concerns → split into multiple commits.

### 2.2 TDD-Driven Workflow (MANDATORY)

**Every task follows this sequence:**

```
1. Feature Branch    → Create branch before any code changes
2. RED               → Write failing tests first
3. GREEN             → Implement minimal code to pass tests
4. REFACTOR          → Clean up while tests stay green
5. Commit            → Atomic commit with passing tests
6. Changeset         → Create changeset if behavior changed
7. HITL Gate         → STOP and wait for user push command
```

**Rules:**
- Never write implementation before tests
- Never commit while tests are failing
- Never push without explicit user command

### 2.3 Feature Branch Naming
```
feat/short-description   → new features
fix/short-description    → bug fixes
refactor/short-desc      → refactoring
chore/short-description  → maintenance
```

Create branch at task start. One branch per task.

### 2.4 Commit Messages
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

### 2.5 Clean Working Tree
- Do not leave uncommitted changes between steps
- Revert unused exploratory edits

### 2.6 Safety
Never commit: secrets, credentials, API keys, tokens.
If detected: remove, rotate, then commit the fix.

---

## 3. Release Management (Changesets)

### 3.1 When Required
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

### 3.2 Semver Classification
- **patch**: bugfix, internal improvement, no API changes
- **minor**: backward-compatible feature addition
- **major**: breaking changes requiring user action

### 3.3 Changeset Content
Must include:
- Affected package(s)
- User impact description
- Operational notes (env vars, migrations, behavior changes)

Format:
- One short headline
- 2-6 bullet points
- `BREAKING:` section if major

### 3.4 Workflow
```bash
# Create changeset
pnpm changeset

# Before release
pnpm changeset version
# commit version bumps + changelog

# Publish
pnpm changeset publish
```

---

## 4. Definition of Done

A PR is NOT complete unless:
- [ ] Tests written BEFORE implementation (TDD)
- [ ] All tests passing
- [ ] Observability present (logs, metrics, health checks)
- [ ] Error handling follows conventions
- [ ] Changeset included (when required)
- [ ] Commits are atomic and logically ordered
- [ ] Each commit is green
- [ ] User has explicitly approved push

**Final rule:** Code that works only in happy-path and is unobservable in prod is NOT production-ready.
