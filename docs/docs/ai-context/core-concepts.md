# AI Context Core Concepts

## What this page is for

Define how RAGler structures and governs context used by LLM-driven applications.

## Concepts

- Context is curated, not raw dump.
- Published data is immutable per operation but replaceable by workflow.
- Human approval gates changes before publication.
- Retrieval quality depends on chunk structure and metadata quality.

## Operational rules

1. Ingest creates draft sessions.
2. Draft edits happen before publish.
3. Publish updates collection knowledge state.
4. Search only targets published content.

## Verify

- No direct draft access from search endpoints.
- Session workflow is required before publish.
