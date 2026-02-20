# FTR-005: Sessions

## Purpose

Provide a draft editing lifecycle before any published mutation.

## Scope

In scope:

- list/get session
- chunk edit operations
- preview and publish handoff
- delete session

Out of scope:

- long-term archival of draft history

## Functional Requirements

- FR-005-001: Store session draft state in Redis.
- FR-005-002: Allow edit/split/merge operations on session chunks.
- FR-005-003: Preview validates readiness for publish.
- FR-005-004: Publish consumes session and commits to collection.

## Non-Functional Constraints

- Enforce TTL to limit stale sessions.
- Prevent inconsistent state transitions.

## Acceptance Checks

- AC-001: Session is retrievable after ingest.
- AC-002: Preview updates/locks status for publish.
- AC-003: Publish returns chunk count and collection ID.

## Dependencies and Risks

Dependencies: Redis and publish pipeline.
Risks: session expiration before user completion.
