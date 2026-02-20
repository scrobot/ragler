# ADR 004: Session TTL in Redis

## Context

Draft sessions are temporary editing artifacts and should not persist indefinitely.

## Decision

Store sessions in Redis with configurable TTL (`SESSION_TTL`).

## Consequences

- Controls memory growth.
- Expired sessions require re-ingest if work is not published.

## Alternatives considered

- Persistent draft storage with manual cleanup only.
