# FTR-001: Data Ingestion

## Purpose

Enable users to create draft sessions from Confluence pages, web URLs, or manual text.

## Scope

In scope:

- `POST /api/ingest/confluence`
- `POST /api/ingest/web`
- `POST /api/ingest/manual`
- session creation with source metadata

Out of scope:

- real-time source sync
- bulk crawling

## Functional Requirements

- FR-001-001: Validate source-specific input payloads.
- FR-001-002: Extract source text content.
- FR-001-003: Create session and return `sessionId`.
- FR-001-004: Persist source metadata for traceability.

## Non-Functional Constraints

- Respect source fetch timeouts.
- Return actionable errors for fetch/auth failures.

## Acceptance Checks

- AC-001: Valid source creates session.
- AC-002: Invalid source returns 4xx with clear message.
- AC-003: Returned session can be retrieved via `/api/session/:id`.

## Dependencies and Risks

Dependencies: OpenAI key (for downstream chunking), Redis.
Risks: external source unavailability; mitigation via retries/timeouts.
