---
sidebar_position: 9
---

# Publishing

## What this page is for

Commit reviewed session chunks into a target collection.

## Endpoint

- `POST /api/session/:id/publish`

Request body:

```json
{
  "targetCollectionId": "<collection-uuid>"
}
```

## Steps

1. Ensure session is previewed.
2. Submit publish request.
3. Confirm response and searchability.

## Verify

- Response contains `publishedChunks` and `collectionId`.
- Search endpoint returns published content.

## Troubleshooting

- Invalid collection UUID: fix `targetCollectionId` format.
- Empty publish: ensure session has chunks.

## Next steps

- [Collections](/docs/product/collections)
