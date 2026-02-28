---
sidebar_position: 2
---

# Ingestion

## What this page is for

Use ingest endpoints to start a draft session from supported source types.

## Endpoints

- `POST /api/ingest/confluence`
- `POST /api/ingest/web`
- `POST /api/ingest/manual`
- `POST /api/ingest/file` — see [File Upload](/docs/product/file-upload)

## Steps

1. Choose source type.
2. Send request with `X-User-ID`.
3. Store returned `sessionId`.
4. Move to session operations.

## Verify

- Response contains `sessionId`, `sourceType`, and timestamps.
- `GET /api/session/<id>` returns draft state.

## Troubleshooting

- Web ingest timeout: tune `WEB_FETCH_TIMEOUT`.
- Confluence auth errors: verify `CONFLUENCE_*` config.

All ingest endpoints accept an optional `chunkingConfig` — see [Configurable Chunking](/docs/product/configurable-chunking).

## Next steps

- [Sessions](/docs/product/sessions)
- [File Upload](/docs/product/file-upload)
- [Configurable Chunking](/docs/product/configurable-chunking)
