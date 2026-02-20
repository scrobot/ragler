# MCP Server Architecture

## What this page is for

Describe how MCP tooling accesses RAGler knowledge safely.

## Component role

The MCP server is a protocol adapter:

- Accepts MCP tool calls.
- Validates tool input.
- Calls backend REST endpoints.
- Returns formatted MCP responses.

## Runtime path

MCP Client -> MCP Server -> RAGler Backend `/api` -> Qdrant

## Constraints

- Read-oriented operations for knowledge querying.
- Depends on backend availability.
- Uses `KMS_API_URL` and `MCP_USER_ID` runtime config.
