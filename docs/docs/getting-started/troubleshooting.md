---
sidebar_position: 4
title: Troubleshooting
---

# Troubleshooting

## What this page is for

Resolve common setup and workflow issues quickly.

## Backend startup issues

- `Environment validation failed`:
  - Check required keys in `backend/.env`.
  - Validate `QDRANT_URL` format (`http://host:port`).

- Port conflict on `3000`:
  - Change `PORT` in `.env`.
  - Restart backend.

## Dependency readiness issues

- `GET /api/health/readiness` is unhealthy:
  - Run `docker compose ps`.
  - Ensure `redis` and `qdrant` are running and mapped to `6379` and `6333`.

## Ingest/session issues

- Confluence ingest fails:
  - Verify `CONFLUENCE_BASE_URL`, `CONFLUENCE_USER_EMAIL`, `CONFLUENCE_API_TOKEN`.

- Session not found:
  - Confirm `sessionId` from ingest response.
  - Check session TTL (`SESSION_TTL`).

## Publish/search issues

- Publish fails with collection errors:
  - Confirm collection exists: `GET /api/collections`.

- Search returns nothing:
  - Confirm publish succeeded.
  - Re-run query with broader terms.

## Next steps

- `/docs/getting-started/configuration`
- `/docs/product/flows/workflow`
