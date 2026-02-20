# Ingestion

## What this page is for

Use ingest endpoints to start a draft session from supported source types.

## Endpoints

- `POST /api/ingest/confluence`
- `POST /api/ingest/web`
- `POST /api/ingest/manual`

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

## Next steps

- `/docs/product/sessions`
