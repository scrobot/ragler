# FTR-006: Publishing

## Purpose

Commit validated session chunks into target collection search index.

## Scope

In scope:

- `POST /api/session/:id/publish`
- embedding generation and vector writes

Out of scope:

- cross-collection transaction orchestration

## Functional Requirements

- FR-006-001: Validate target collection and session state.
- FR-006-002: Write published chunks and metadata to Qdrant.
- FR-006-003: Return publish summary (`publishedChunks`, `collectionId`).

## Non-Functional Constraints

- Avoid stale/duplicate artifacts during publish updates.
- Handle transient downstream failures gracefully.

## Acceptance Checks

- AC-001: Successful publish makes chunks searchable.
- AC-002: Invalid publish request returns clear 4xx.
- AC-003: Session is no longer active draft after successful publish.

## Dependencies and Risks

Dependencies: Vector module, OpenAI embeddings.
Risks: partial failures; mitigated by robust error handling and retries.
