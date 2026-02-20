# FTR-004: Collections

## Purpose

Manage knowledge grouping contexts and their lifecycle.

## Scope

In scope:

- `GET /api/collections`
- `GET /api/collections/:id`
- `POST /api/collections`
- `DELETE /api/collections/:id`

Out of scope:

- cross-project/global taxonomy governance

## Functional Requirements

- FR-004-001: Create collections with name and optional description.
- FR-004-002: List and retrieve collections.
- FR-004-003: Delete collection safely.

## Non-Functional Constraints

- Collection identifiers must be UUIDs.
- Operations should be auditable via request identity headers.

## Acceptance Checks

- AC-001: Create returns new collection entity.
- AC-002: List includes created entity.
- AC-003: Delete removes entity from subsequent reads.

## Dependencies and Risks

Dependencies: Qdrant registry/data modeling.
Risks: accidental deletion; mitigated by confirmation in clients.
