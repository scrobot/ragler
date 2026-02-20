# ADR 003: Separate LLM Roles

## Context

Chunk generation and assistant-style operations have different latency/cost requirements.

## Decision

Use distinct model responsibilities (higher capability for chunking; lower-cost paths for assistant tasks when acceptable).

## Consequences

- Better control of quality/cost tradeoffs.
- More configuration surface.

## Alternatives considered

- Single-model strategy for all operations.
