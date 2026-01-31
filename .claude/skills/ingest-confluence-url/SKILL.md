---
name: ingest-confluence-url
description: Safe ingestion of external sources
---

Rules:
- Confluence: single document only
- No realtime sync
- No space crawling
- source_id = hash(url)
- Fail fast on fetch errors
- Retriable IO, non-retriable validation errors

Never ingest implicitly.