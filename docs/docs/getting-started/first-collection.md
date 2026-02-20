---
sidebar_position: 3
title: First Collection
---

# First Collection Workflow

## What this page is for

Run an end-to-end workflow: create collection, ingest content, review session, publish, search.

## Prerequisites

- Backend running at `http://localhost:3000`
- Redis and Qdrant healthy
- `X-User-ID` value for API calls

## Steps

1. Create collection.

```bash
curl -X POST http://localhost:3000/api/collections \
  -H 'Content-Type: application/json' \
  -H 'X-User-ID: demo@ragler.ai' \
  -d '{"name":"Support KB","description":"Support docs"}'
```

2. Ingest manual source.

```bash
curl -X POST http://localhost:3000/api/ingest/manual \
  -H 'Content-Type: application/json' \
  -H 'X-User-ID: demo@ragler.ai' \
  -d '{"content":"Redis stores draft sessions. Qdrant stores published chunks."}'
```

3. Generate chunks if needed.

```bash
curl -X POST http://localhost:3000/api/session/<SESSION_ID>/chunks \
  -H 'X-User-ID: demo@ragler.ai'
```

4. Review and adjust chunks.

```bash
curl http://localhost:3000/api/session/<SESSION_ID> -H 'X-User-ID: demo@ragler.ai'
curl -X PATCH http://localhost:3000/api/session/<SESSION_ID>/chunks/<CHUNK_ID> \
  -H 'Content-Type: application/json' \
  -H 'X-User-ID: demo@ragler.ai' \
  -d '{"text":"Updated chunk text"}'
```

5. Preview and publish.

```bash
curl -X POST http://localhost:3000/api/session/<SESSION_ID>/preview -H 'X-User-ID: demo@ragler.ai'
curl -X POST http://localhost:3000/api/session/<SESSION_ID>/publish \
  -H 'Content-Type: application/json' \
  -H 'X-User-ID: demo@ragler.ai' \
  -d '{"targetCollectionId":"<COLLECTION_ID>"}'
```

6. Search published content.

```bash
curl -X POST http://localhost:3000/api/search \
  -H 'Content-Type: application/json' \
  -H 'X-User-ID: demo@ragler.ai' \
  -d '{"query":"Where are draft sessions stored?","collectionId":"<COLLECTION_ID>","limit":5}'
```

## Verify

- Publish response contains `publishedChunks` > 0.
- Search returns relevant results.

## Troubleshooting

- `Invalid collection ID format`: ensure UUID for `targetCollectionId`.
- Empty search results: confirm publish completed and query matches stored content.

## Next steps

- `/docs/product/intro`
- `/docs/architecture/overview`
