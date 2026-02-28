---
sidebar_position: 6
---

# Document Lineage

## What this page is for

Browse documents within a collection, grouped by source, with quality aggregation and lineage metadata.

## Endpoint

- `GET /api/collections/:collectionId/documents`

## How it works

Every chunk stores its source document metadata in the `doc.*` payload fields. The documents endpoint aggregates chunks by `source_id` to provide a document-level view of your collection, including chunk counts and average quality scores.

## Document metadata

Each document summary includes:

| Field | Description |
|-------|-------------|
| `sourceId` | Unique identifier (MD5 of source URL) |
| `title` | Document title |
| `sourceType` | `confluence`, `web`, `manual`, or `file` |
| `sourceUrl` | Original source URL |
| `filename` | Original filename (file uploads only) |
| `mimeType` | File MIME type (file uploads only) |
| `chunkCount` | Number of chunks from this document |
| `avgQualityScore` | Average quality score across chunks |
| `ingestDate` | When the document was first ingested |
| `lastModifiedAt` | Most recent modification timestamp |

## Example

```bash
curl http://localhost:3000/api/collections/<collectionId>/documents \
  -H "X-User-ID: user-1"
```

### Response

```json
{
  "documents": [
    {
      "sourceId": "a1b2c3d4",
      "title": "API Authentication Guide",
      "sourceType": "confluence",
      "sourceUrl": "https://wiki.example.com/pages/12345",
      "filename": null,
      "mimeType": null,
      "chunkCount": 8,
      "avgQualityScore": 85.5,
      "ingestDate": "2025-01-10T09:00:00.000Z",
      "lastModifiedAt": "2025-01-15T14:30:00.000Z"
    }
  ],
  "total": 1
}
```

## Verify

- Response lists all documents in the collection grouped by source.
- `chunkCount` matches the actual number of chunks per document.
- `avgQualityScore` reflects quality scores set via the collection editor.

## Next steps

- [Collections](/docs/product/collections) — manage chunks within a collection.
- [Publishing](/docs/product/publishing) — publish new content to a collection.
