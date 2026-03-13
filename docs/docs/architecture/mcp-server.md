# MCP Integration

## What this page is for

Describe how MCP tooling accesses RAGler knowledge.

## Component role

MCP is a built-in module of the backend (not a separate service). It exposes MCP protocol endpoints directly from the NestJS application:

- **Streamable HTTP** — `POST /mcp` (MCP 2025-03-26 spec)
- **Legacy SSE** — `GET /sse` + `POST /messages`

## Available tools

| Tool | Description |
|------|-------------|
| `search_knowledge` | Semantic search across collections with filters |
| `list_collections` | List all knowledge collections |
| `get_collection_info` | Get details of a specific collection |

## Runtime path

```
MCP Client → Backend /mcp endpoint → McpToolsService → VectorService / CollectionService → Qdrant
```

No HTTP round-trip between MCP and backend — tools call services directly via NestJS dependency injection.

## Constraints

- Read-oriented operations for knowledge querying.
- MCP endpoints are excluded from the `/api` prefix and throttler guard.
