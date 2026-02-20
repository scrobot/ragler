# Product Overview

## What this page is for

Understand the operational workflow and user-facing concepts in RAGler.

## Core entities

- `Source`: raw content from manual input, web, or Confluence.
- `Session`: draft workspace in Redis.
- `Chunk`: atomic knowledge unit.
- `Collection`: published context in Qdrant.

## Workflow summary

1. Ingest source.
2. Generate/edit chunks in session.
3. Preview and publish to collection.
4. Search published knowledge.

## Verify

- You can list collections and sessions from API.
- You can publish and then retrieve via search.

## Next steps

- `/docs/product/ingestion`
- `/docs/product/sessions`
- `/docs/product/publishing`
- `/docs/product/collections`
