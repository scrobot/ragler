# Collections

## What this page is for

Manage knowledge collections and direct chunk editing.

## Core endpoints

- `GET /api/collections`
- `GET /api/collections/:id`
- `POST /api/collections`
- `DELETE /api/collections/:id`

Collection editor endpoints:

- `GET/POST /api/collections/:collectionId/chunks`
- `GET/PUT/DELETE /api/collections/:collectionId/chunks/:chunkId`
- `POST /api/collections/:collectionId/chunks/:chunkId/split`
- `POST /api/collections/:collectionId/chunks/merge`
- `PUT /api/collections/:collectionId/reorder`

## Verify

- Collection list returns created collections.
- Direct chunk edits are visible in subsequent reads and search results.

## Next steps

- `/docs/product/flows/intro`
