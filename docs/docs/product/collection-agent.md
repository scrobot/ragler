---
sidebar_position: 8
---

# Collection Agent

## What this page is for

Use the AI agent to interact with collection content, manage chunks, and perform automated collection maintenance tasks through natural language.

## Endpoints

### Chat (streaming)

- `POST /api/collections/:collectionId/agent/chat` — SSE streaming chat
- `POST /api/collections/:collectionId/agent/chat/sync` — synchronous chat

### Collection cleaning

- `POST /api/collections/:collectionId/agent/clean` — SSE streaming clean operation

### Session management

- `POST /api/collections/:collectionId/agent/sessions` — create session
- `GET /api/collections/:collectionId/agent/sessions` — list sessions
- `GET /api/collections/:collectionId/agent/sessions/:sessionId` — get session with messages
- `PATCH /api/collections/:collectionId/agent/sessions/:sessionId` — update session title
- `DELETE /api/collections/:collectionId/agent/sessions/:sessionId` — delete session

### System prompts

- `GET /api/collections/:collectionId/agent/prompts/global` — get global prompt
- `PATCH /api/collections/:collectionId/agent/prompts/global` — set global prompt
- `DELETE /api/collections/:collectionId/agent/prompts/global` — reset to default
- `GET /api/collections/:collectionId/agent/prompt` — get collection-specific prompt
- `PATCH /api/collections/:collectionId/agent/prompt` — set collection-specific prompt
- `DELETE /api/collections/:collectionId/agent/prompt` — remove collection override

## How it works

The collection agent is an AI assistant with tools to search, read, and modify chunks within a collection. It streams responses via Server-Sent Events (SSE) so you see thinking, tool calls, and results in real time.

### SSE event types

| Event | Description |
|-------|-------------|
| `thinking` | Agent reasoning in progress |
| `tool_call` | Agent is invoking a tool |
| `tool_result` | Tool execution result |
| `message` | Final text response |
| `error` | Error occurred |
| `done` | Stream complete |

## Steps

1. Create an agent session for your collection.
2. Send a chat message with the session ID.
3. The agent searches the collection, reasons about your request, and responds.
4. For maintenance tasks, use the clean endpoint to detect and remove dirty chunks.

## Example

### Create a session

```bash
curl -X POST http://localhost:3000/api/collections/<collectionId>/agent/sessions \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user-1" \
  -d '{ "title": "Quality review" }'
```

### Chat with the agent (sync mode)

```bash
curl -X POST http://localhost:3000/api/collections/<collectionId>/agent/chat/sync \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user-1" \
  -d '{
    "message": "Find chunks with low quality scores and suggest improvements",
    "sessionId": "<sessionId>"
  }'
```

### Clean collection

```bash
curl -X POST http://localhost:3000/api/collections/<collectionId>/agent/clean \
  -H "X-User-ID: user-1"
```

SSE events stream progress: `clean_progress`, `dirty_chunk_found`, `dirty_chunk_deleted`, `clean_complete`.

## Verify

- Agent sessions are created and listed correctly.
- Chat responses include tool calls and meaningful answers.
- Collection cleaning identifies and removes low-quality chunks.

## Next steps

- [Chat Playground](/docs/product/chat-playground) — simple RAG chat without agent capabilities.
- [Collections](/docs/product/collections) — manual collection management.
