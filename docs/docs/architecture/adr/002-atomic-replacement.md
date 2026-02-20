# ADR 002: Atomic Replacement on Publish

## Context

Chunk boundaries can change during edits; naive upserts can leave stale chunks.

## Decision

Publish performs replacement semantics per source/target context so outdated chunks are not retained.

## Consequences

- Prevents duplicate/stale chunk artifacts.
- Requires robust failure handling around write operations.

## Alternatives considered

- Incremental patching by deterministic chunk IDs.
