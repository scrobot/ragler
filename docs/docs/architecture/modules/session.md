# Module: Session

## Purpose

Manage draft chunk lifecycle before publish.

## Responsibilities

- List/get sessions
- Generate/edit/split/merge chunks
- Preview lock and publish handoff
- Delete sessions

## Storage

- Redis-backed draft state with TTL.

## Verify

- Edit operations update session payload.
- Preview and publish transition complete successfully.
