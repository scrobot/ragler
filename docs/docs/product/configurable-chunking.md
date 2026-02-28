---
sidebar_position: 4
---

# Configurable Chunking

## What this page is for

Control how ingested content is split into chunks using LLM-powered or character-based methods.

## Chunking methods

### LLM chunking (default)

Uses OpenAI to intelligently split content into semantically coherent chunks. The LLM identifies natural boundaries based on topic, structure, and meaning.

- Best for: prose, documentation, articles
- Produces: typed chunks (`knowledge`, `navigation`, `table_row`, `glossary`, `faq`, `code`)
- Extracts: heading paths, tags, language detection

### Character chunking

Splits content by character count with paragraph and sentence boundary detection. Uses configurable chunk size and overlap.

- Best for: large documents where LLM cost is a concern
- Produces: uniform-sized text chunks
- Configurable: chunk size (100–10,000 chars), overlap (0–2,000 chars)

## Configuration

Pass `chunkingConfig` in any ingest request body:

```json
{
  "method": "llm",
  "chunkSize": 1000,
  "overlap": 200
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `method` | `"llm"` \| `"character"` | `"llm"` | Chunking strategy |
| `chunkSize` | number (100–10,000) | 1000 | Target chunk size in characters |
| `overlap` | number (0–2,000) | 200 | Overlap between consecutive chunks |

## Examples

### LLM chunking (default)

```bash
curl -X POST http://localhost:3000/api/ingest/manual \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user-1" \
  -d '{
    "content": "Your document text here..."
  }'
```

### Character chunking with custom settings

```bash
curl -X POST http://localhost:3000/api/ingest/manual \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user-1" \
  -d '{
    "content": "Your document text here...",
    "chunkingConfig": {
      "method": "character",
      "chunkSize": 500,
      "overlap": 100
    }
  }'
```

## Verify

- After ingestion, `GET /api/session/<id>` shows generated chunks.
- LLM chunks have typed `chunkType` values and extracted metadata.
- Character chunks are uniformly sized with overlap at boundaries.

## Next steps

- [Sessions](/docs/product/sessions) — review and edit generated chunks.
- [Publishing](/docs/product/publishing) — publish curated chunks to a collection.
