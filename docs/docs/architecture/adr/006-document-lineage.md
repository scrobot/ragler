# ADR 006: Document Lineage via Qdrant Payload Aggregation

## Context

Users need to browse ingested content at the document level (source → chunks). Adding a dedicated SQL store for document metadata was considered but adds operational complexity.

## Decision

Store all document metadata in the existing Qdrant `doc.*` payload fields (`source_id`, `source_type`, `filename`, `mime_type`, `ingest_date`). Aggregate document summaries at API time by scrolling and grouping chunks by `doc.source_id`.

## Consequences

- No additional database dependency.
- Aggregation happens at query time — acceptable for collections with fewer than 10K chunks.
- Document-level operations (delete all chunks for a document) are straightforward with Qdrant filters.

## Alternatives considered

- Separate PostgreSQL table for documents — adds operational burden.
- Redis cache of document summaries — stale data risk without invalidation logic.
