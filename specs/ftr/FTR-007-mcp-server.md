# FTR-007: MCP Server

## Purpose

Expose RAGler knowledge access through MCP-compatible tools.

## Scope

In scope:

- `search_knowledge`
- `list_collections`
- `get_collection_info`
- input validation and backend API forwarding

Out of scope:

- direct vector DB access
- write/edit operations

## Functional Requirements

- FR-007-001: Validate tool inputs before backend calls.
- FR-007-002: Map tool requests to backend `/api` endpoints.
- FR-007-003: Return structured responses and clear failures.

## Non-Functional Constraints

- Stateless service model.
- Request timeout controls for backend calls.

## Acceptance Checks

- AC-001: Valid search returns ranked results.
- AC-002: Invalid UUID inputs return validation errors.
- AC-003: Collection list and detail tools return backend-consistent data.

## Dependencies and Risks

Dependencies: Backend API availability.
Risks: upstream latency/outage; mitigated by explicit error propagation.
