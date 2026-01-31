---
name: core-production-engineering
description: Enforces production-grade engineering thinking for every change, including explicit observability requirements
---

You are not just implementing logic.
You are designing the **runtime behavior** of a production system.

For EVERY task (even "small"), you MUST consider these dimensions and implement required artifacts.

---

## 1) Runtime behavior
Ask:
- Is this IO-bound or CPU-bound?
- Can it block the event loop / threads?
- Does it allocate memory repeatedly?
- Does it create unbounded queues / buffers?

---

## 2) Failure modes
For each external dependency (HTTP, Redis, Qdrant, LLM):
- Timeout? Unavailable? Partial responses?
- Retryable vs non-retryable?
- What is the user-visible behavior?

Rules:
- Fail explicitly (no silent failures)
- Use timeouts
- Map errors to consistent API error shape

---

## 3) Idempotency & retries
- Can this operation be retried safely?
- What happens on duplicate requests?
- Are side effects duplicated?

If not idempotent:
- redesign, guard, or document + test

---

## 4) Concurrency & consistency
Consider:
- concurrent requests / double submits
- session locking (preview)
- publish vs edit collisions
- race conditions on shared state

Define:
- ownership
- locking/sequencing
- conflict resolution

---

# 5) OBSERVABILITY (NON-NEGOTIABLE)
Observability is part of the feature, not an afterthought.

For any change that affects runtime behavior or user-visible flows,
you MUST ensure:

## 5.1 Structured logging
- Use structured JSON logs (no ad-hoc string logs)
- Include correlation identifiers:
  - request_id (or trace_id)
  - session_id (when available)
  - user_id (from trusted header)
  - source_id / collection_id (when relevant)
- Log levels:
  - ERROR: failures that require attention or break a flow
  - WARN: degraded behavior / retries / partial fallbacks
  - INFO: key lifecycle transitions (ingest started, preview locked, publish committed)
- Never log secrets (tokens, API keys, credentials)

Minimum required log events for core flows:
- ingest_start / ingest_success / ingest_failure
- chunking_start / chunking_success / chunking_failure
- preview_lock / preview_validation_failed
- publish_start / publish_delete_done / publish_upsert_done / publish_success / publish_failure

## 5.2 Metrics (Prometheus-style)
For every external call:
- request counter and error counter
- latency histogram

Required metric families:
- http_server_requests_total{route,method,status}
- http_server_request_duration_seconds{route,method}
- dependency_requests_total{dep,op,status}
- dependency_request_duration_seconds{dep,op}
- llm_requests_total{scenario,status}
- llm_request_duration_seconds{scenario}
- publish_operations_total{status}
- publish_duration_seconds

Draft/session metrics:
- draft_sessions_created_total
- draft_sessions_active (gauge)
- draft_sessions_duration_seconds (histogram)
- preview_locks_total
- publish_retries_total (if implemented)

If using queues (BullMQ):
- queue_jobs_total{queue,status}
- queue_job_duration_seconds{queue}

## 5.3 Health checks
Expose health endpoints that clearly distinguish:
- liveness (process is alive)
- readiness (dependencies reachable)

Minimum:
- GET /health/live  -> 200 if process is running
- GET /health/ready -> 200 only if critical deps are healthy:
  - Redis connectivity
  - Qdrant connectivity
  - (optional) LLM gateway configured (NOT a hard ping unless required)

Rules:
- readiness must fail fast if critical dependency is down
- liveness must stay green unless process is broken

## 5.4 Tracing (if enabled in stack)
If OpenTelemetry is available:
- Create spans for:
  - ingest
  - chunking
  - refine
  - preview
  - publish (delete/upsert subspans)
- Propagate trace context across HTTP calls

If tracing is not yet set up:
- at least ensure request_id correlation in logs and metrics.

## 5.5 Alerts / SLO thinking (design-time)
For every new metric, consider:
- what alert would trigger on it?
- what would an oncall do?

Minimum recommended alert signals:
- high error rate for /publish
- high latency for dependency calls (Redis/Qdrant/LLM)
- growth of active draft sessions without decreases

---

## 6) Degradation & recovery
Assume:
- pods restart
- network flakes
- deployments mid-request

Prefer:
- explicit errors + safe retry
- consistent state after failures

No hidden in-memory state as source of truth.

---

## 7) Backward compatibility & evolution
When changing behavior:
- will existing sessions break?
- will published data remain valid?

If behavior changes:
- document it
- guard it
- or version it

---

## 8) Tests as production defense
Tests must cover:
- happy path
- failure modes (timeouts/unavailable deps)
- idempotency / duplicate submissions (where relevant)
- RBAC / mode restrictions
- atomic publish correctness (no duplicates)

---

## 9) Definition of Done (DoD) for any PR
A PR is NOT done unless:
- tests added/updated and passing
- observability is present:
  - required logs emitted
  - required metrics updated
  - health checks unaffected (or added if missing)
- error handling follows conventions
- runtime behavior considerations addressed

---

## Final rule
If code works only in happy-path and is unobservable in prod — it is NOT production-ready.