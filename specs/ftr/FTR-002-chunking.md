# FTR-002: Chunking

## Purpose

Transform source text into editable chunks suitable for retrieval.

## Scope

In scope:

- `POST /api/session/:id/chunks`
- split/merge/edit chunk operations within session

Out of scope:

- autonomous chunk quality scoring at ingest time

## Functional Requirements

- FR-002-001: Generate chunks from source content.
- FR-002-002: Support `split` and `merge` session operations.
- FR-002-003: Preserve chunk ordering and session integrity.

## Non-Functional Constraints

- Chunk operations should complete in interactive latency ranges.
- Failures must not corrupt session state.

## Acceptance Checks

- AC-001: Generated chunks appear in session payload.
- AC-002: Split/merge operations update chunk list deterministically.
- AC-003: Manual chunk text updates persist.

## Dependencies and Risks

Dependencies: Session module, LLM integration.
Risks: poor auto boundaries; mitigated by manual edits.
