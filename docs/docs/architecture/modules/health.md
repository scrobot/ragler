# Module: Health

## Purpose

Expose service liveness and readiness for operations and orchestration.

## Endpoints

- `GET /api/health`
- `GET /api/health/liveness`
- `GET /api/health/readiness`

## Checks

- Process health
- Redis connectivity
- Qdrant connectivity
