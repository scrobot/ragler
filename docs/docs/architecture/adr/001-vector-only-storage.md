# ADR 001: Vector-Only Published Storage

## Context

RAGler needs efficient retrieval-oriented storage for published knowledge with metadata filtering.

## Decision

Use Qdrant as the primary published knowledge store instead of adding a separate SQL store for core retrieval data.

## Consequences

- Simplifies retrieval architecture.
- Requires careful payload modeling for metadata needs.

## Alternatives considered

- Split SQL metadata + vector DB.
- Full SQL + external embedding index.
