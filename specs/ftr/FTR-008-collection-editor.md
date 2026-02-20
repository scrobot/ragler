# FTR-008: Collection Editor

## Purpose

Allow direct management of published chunks and AI-assisted maintenance.

## Scope

In scope:

- direct chunk CRUD in collections
- split/merge/reorder operations
- quality score updates
- collection agent chat and approval flow

Out of scope:

- multi-user collaborative locking model
- full version history/undo stack

## Functional Requirements

- FR-008-001: List collection chunks with pagination/filtering.
- FR-008-002: Create/update/delete chunk content directly in collection.
- FR-008-003: Support split/merge and reorder operations.
- FR-008-004: Support AI assistant suggestion and approval endpoints.

## Non-Functional Constraints

- Keep edit operations interactive.
- Ensure vector/payload consistency after updates.

## Acceptance Checks

- AC-001: Direct edits appear in chunk reads and search.
- AC-002: Reorder persists stable positions.
- AC-003: Agent approval endpoints gate operation execution.

## Dependencies and Risks

Dependencies: Collection, vector, and agent modules.
Risks: accidental destructive edits; mitigated by client confirmations and audit metadata.
