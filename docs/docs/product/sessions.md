# Sessions

## What this page is for

Operate draft sessions before publishing.

## Endpoints

- `GET /api/session`
- `GET /api/session/:id`
- `POST /api/session/:id/chunks`
- `POST /api/session/:id/chunks/merge`
- `POST /api/session/:id/chunks/:chunkId/split`
- `PATCH /api/session/:id/chunks/:chunkId`
- `POST /api/session/:id/preview`
- `DELETE /api/session/:id`

## Steps

1. Open session and inspect chunks.
2. Generate chunks if source has none.
3. Edit, split, and merge chunks.
4. Preview to lock and validate before publish.

## Verify

- Session status changes after preview.
- Updated chunk text is reflected in `GET /api/session/:id`.

## Next steps

- `/docs/product/publishing`
