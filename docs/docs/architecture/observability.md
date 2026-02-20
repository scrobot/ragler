# Observability

## What this page is for

Define runtime visibility points for operations and failure diagnosis.

## Signals

- API logs for ingest/session/publish/search requests
- Health endpoints for dependency status
- Build/test outputs in CI

## Critical checks

- `GET /api/health/liveness`
- `GET /api/health/readiness`

## Recommended dashboard counters

- ingest requests by source type
- publish success/failure counts
- search request latency percentiles
- collection editor operation counts
