---
sidebar_position: 7
---

# Chat Playground

## What this page is for

Query your published knowledge base using RAG-powered chat with citations and conversation history.

## Endpoint

- `POST /api/collections/:collectionId/chat`

## How it works

1. Your message is embedded and used to search the collection's published chunks.
2. Relevant chunks are retrieved and passed as context to the LLM.
3. The LLM generates an answer grounded in your knowledge base.
4. Citations link back to the source chunks with relevance scores.

## Steps

1. Ensure the target collection has published chunks.
2. Send a chat message with an optional `sessionId` for conversation continuity.
3. Review the answer and its citations.
4. Continue the conversation using the returned `sessionId`.

## Example

### First message (new conversation)

```bash
curl -X POST http://localhost:3000/api/collections/<collectionId>/chat \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user-1" \
  -d '{
    "message": "How does authentication work in our system?"
  }'
```

### Response

```json
{
  "answer": "Authentication uses JWT tokens issued by...",
  "sessionId": "chat-session-456",
  "citations": [
    {
      "chunkId": "chunk-789",
      "content": "The authentication module issues JWT tokens...",
      "score": 0.92
    }
  ]
}
```

### Follow-up message (same conversation)

```bash
curl -X POST http://localhost:3000/api/collections/<collectionId>/chat \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user-1" \
  -d '{
    "message": "What about refresh tokens?",
    "sessionId": "chat-session-456"
  }'
```

## Request body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string (1–5,000) | yes | The question or prompt |
| `sessionId` | string | no | Existing session ID for conversation continuity |

## Verify

- Response contains `answer`, `sessionId`, and `citations` array.
- Citations reference actual chunk IDs from the collection.
- Passing the same `sessionId` maintains conversation context.

## Next steps

- [Collection Agent](/docs/product/collection-agent) — use the AI agent for collection management tasks.
- [Collections](/docs/product/collections) — manage your knowledge collections.
