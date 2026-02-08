---
sidebar_position: 3
title: Your First Collection
---

# Create Your First Collection

This tutorial will guide you through creating your first knowledge collection in RAGler, from ingesting content to publishing it for RAG retrieval.

## Overview

You'll learn how to:
1. Create a knowledge collection
2. Ingest content (we'll use manual text for simplicity)
3. Review and edit chunks in a draft session
4. Publish chunks to your collection

**Time required:** ~10 minutes

## Prerequisites

- RAGler backend is running (`pnpm start:dev` in the `backend/` directory)
- Backend API available at `http://localhost:3000/api`
- OpenAI API key configured in `.env`

## Step 1: Create a Collection

Collections organize your knowledge by context or use case. Let's create a collection for product documentation.

### Using the API

```bash
curl -X POST http://localhost:3000/api/collections \
  -H "Content-Type: application/json" \
  -H "X-User-ID: you@example.com" \
  -H "X-User-Role: DEV" \
  -d '{
    "name": "Product Documentation",
    "description": "Knowledge base for product features and user guides",
    "purpose": "Answering user questions about product functionality"
  }'
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Product Documentation",
  "description": "Knowledge base for product features and user guides",
  "purpose": "Answering user questions about product functionality",
  "createdAt": "2026-02-06T10:00:00.000Z",
  "createdBy": "you@example.com"
}
```

**Save the collection ID** — you'll need it later to publish chunks.

### Using Swagger UI

1. Open `http://localhost:3000/api/docs`
2. Find the **Collections** section
3. Click **POST /api/collections**
4. Click **Try it out**
5. Fill in the request body:
   ```json
   {
     "name": "Product Documentation",
     "description": "Knowledge base for product features and user guides",
     "purpose": "Answering user questions about product functionality"
   }
   ```
6. Add headers:
   - `X-User-ID`: `you@example.com`
   - `X-User-Role`: `DEV`
7. Click **Execute**

## Step 2: Ingest Content

Now let's ingest some content. We'll use **manual input** for this tutorial (Confluence and web ingestion work similarly).

### Sample Content

We'll use this sample text about RAGler:

```text
RAGler is a knowledge management system for RAG (Retrieval-Augmented Generation).

It enables non-ML specialists like developers and L2 support to curate knowledge bases
through a Human-in-the-Loop workflow. Content is ingested from Confluence, web URLs,
or manual input.

The system splits documents into semantic chunks using GPT-4o, allows users to preview
and edit chunks in a draft session, and publishes validated chunks to a Qdrant vector
database for retrieval.

RAGler supports role-based access with Simple Mode for L2 Support and Advanced Mode
for developers and ML specialists.
```

### Start Ingestion Session

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "X-User-ID: you@example.com" \
  -H "X-User-Role: DEV" \
  -d '{
    "sourceType": "manual",
    "content": "RAGler is a knowledge management system for RAG (Retrieval-Augmented Generation). It enables non-ML specialists like developers and L2 support to curate knowledge bases through a Human-in-the-Loop workflow. Content is ingested from Confluence, web URLs, or manual input. The system splits documents into semantic chunks using GPT-4o, allows users to preview and edit chunks in a draft session, and publishes validated chunks to a Qdrant vector database for retrieval. RAGler supports role-based access with Simple Mode for L2 Support and Advanced Mode for developers and ML specialists.",
    "sourceUrl": "manual://getting-started-tutorial",
    "metadata": {
      "title": "RAGler Introduction",
      "author": "Tutorial"
    }
  }'
```

**What happens:**
1. Content is sent to the backend
2. OpenAI GPT-4o analyzes the content and splits it into semantic chunks
3. A draft session is created in Redis
4. Chunks are ready for preview and editing

**Response:**
```json
{
  "sessionId": "sess_abc123def456",
  "status": "DRAFT",
  "sourceId": "b3d4e5f6a1b2c3d4e5f6",
  "sourceUrl": "manual://getting-started-tutorial",
  "chunksCount": 3,
  "chunks": [
    {
      "id": "chunk_1",
      "content": "RAGler is a knowledge management system for RAG (Retrieval-Augmented Generation). It enables non-ML specialists like developers and L2 support to curate knowledge bases through a Human-in-the-Loop workflow.",
      "order": 0
    },
    {
      "id": "chunk_2",
      "content": "Content is ingested from Confluence, web URLs, or manual input. The system splits documents into semantic chunks using GPT-4o, allows users to preview and edit chunks in a draft session, and publishes validated chunks to a Qdrant vector database for retrieval.",
      "order": 1
    },
    {
      "id": "chunk_3",
      "content": "RAGler supports role-based access with Simple Mode for L2 Support and Advanced Mode for developers and ML specialists.",
      "order": 2
    }
  ]
}
```

**Save the session ID** — you'll use it to preview and publish.

## Step 3: Preview and Edit Chunks

Let's review the generated chunks.

### View Session

```bash
curl http://localhost:3000/api/sessions/sess_abc123def456 \
  -H "X-User-ID: you@example.com" \
  -H "X-User-Role: DEV"
```

**Response:** (full session details with all chunks)

### Edit a Chunk (Optional)

If you want to modify chunk content:

```bash
curl -X PATCH http://localhost:3000/api/sessions/sess_abc123def456/chunks/chunk_1 \
  -H "Content-Type: application/json" \
  -H "X-User-ID: you@example.com" \
  -H "X-User-Role: DEV" \
  -d '{
    "content": "RAGler is a knowledge management system designed for RAG (Retrieval-Augmented Generation). It empowers non-ML specialists, including developers and L2 support teams, to curate knowledge bases using a Human-in-the-Loop workflow."
  }'
```

### Split a Chunk (Advanced Mode Only)

In Advanced Mode, you can split chunks:

```bash
curl -X POST http://localhost:3000/api/sessions/sess_abc123def456/chunks/chunk_2/split \
  -H "Content-Type: application/json" \
  -H "X-User-ID: you@example.com" \
  -H "X-User-Role: DEV" \
  -d '{
    "splitIndex": 120
  }'
```

### Merge Chunks (Advanced Mode Only)

Or merge multiple chunks:

```bash
curl -X POST http://localhost:3000/api/sessions/sess_abc123def456/chunks/merge \
  -H "Content-Type: application/json" \
  -H "X-User-ID: you@example.com" \
  -H "X-User-Role: DEV" \
  -d '{
    "chunkIds": ["chunk_1", "chunk_2"]
  }'
```

## Step 4: Preview Before Publishing

Before publishing, lock the session and validate the final structure:

```bash
curl -X POST http://localhost:3000/api/sessions/sess_abc123def456/preview \
  -H "X-User-ID: you@example.com" \
  -H "X-User-Role: DEV"
```

**Response:**
```json
{
  "sessionId": "sess_abc123def456",
  "status": "LOCKED",
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": []
  },
  "chunksCount": 3,
  "estimatedTokens": 150
}
```

**What happens:**
- Session is locked (no further edits allowed)
- Chunks are validated
- Ready for publishing

## Step 5: Publish to Collection

Now publish the validated chunks to your collection:

```bash
curl -X POST http://localhost:3000/api/sessions/sess_abc123def456/publish \
  -H "Content-Type: application/json" \
  -H "X-User-ID: you@example.com" \
  -H "X-User-Role: DEV" \
  -d '{
    "collectionId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**What happens:**
1. OpenAI generates embeddings (vectors) for each chunk
2. **Atomic replacement:**
   - All existing chunks with the same `source_id` are deleted from Qdrant
   - New chunks are inserted with fresh embeddings
3. Session is deleted from Redis
4. Chunks are now searchable in the collection

**Response:**
```json
{
  "success": true,
  "collectionId": "550e8400-e29b-41d4-a716-446655440000",
  "publishedChunks": 3,
  "sourceId": "b3d4e5f6a1b2c3d4e5f6",
  "operation": "atomic_replace"
}
```

## Step 6: Verify Publication

Check that your chunks are in the collection:

```bash
curl http://localhost:3000/api/collections/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-User-ID: you@example.com" \
  -H "X-User-Role: DEV"
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Product Documentation",
  "description": "Knowledge base for product features and user guides",
  "chunksCount": 3,
  "lastUpdated": "2026-02-06T10:15:00.000Z"
}
```

## Step 7: Search Your Collection

Now your content is searchable! (Search endpoint TBD in RAGler v1.1)

## What You Learned

Congratulations! You've completed the full RAGler workflow:

- ✅ **Created a collection** to organize knowledge
- ✅ **Ingested content** using manual input
- ✅ **Reviewed chunks** generated by GPT-4o
- ✅ **Edited chunks** (optional) to improve quality
- ✅ **Published chunks** to Qdrant using atomic replacement
- ✅ **Verified** that content is searchable

## Next Steps

### Try Other Data Sources

**Ingest from a URL:**
```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "X-User-ID: you@example.com" \
  -H "X-User-Role: DEV" \
  -d '{
    "sourceType": "web",
    "sourceUrl": "https://example.com/docs/guide.html"
  }'
```

**Ingest from Confluence:**
```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "X-User-ID: you@example.com" \
  -H "X-User-Role: DEV" \
  -d '{
    "sourceType": "confluence",
    "sourceUrl": "https://your-domain.atlassian.net/wiki/spaces/DOCS/pages/123456/Guide"
  }'
```

### Explore User Roles

**Simple Mode (L2 Support):**
- Cannot split/merge chunks
- Focused on content editing only
- Set header: `X-User-Role: L2`

**Advanced Mode (Developers, ML Specialists):**
- Full chunk structure control
- Split, merge, and reorganize chunks
- Set header: `X-User-Role: DEV` or `X-User-Role: ML`

### Learn More

- [Product Guide](/docs/product/intro) — Understand sessions, collections, and workflows
- [Ingestion Strategies](/docs/product/ingestion) — Deep dive on Confluence, web, and manual sources
- [Publishing](/docs/product/publishing) — Learn about atomic replacement and versioning
- [Simple vs Advanced Mode](/docs/product/flows/simple-mode) — Workflow differences by role

## Troubleshooting

**Session not found:**
- Sessions are ephemeral and stored in Redis
- If Redis restarts, draft sessions are lost
- Always publish or save important work

**OpenAI rate limits:**
- Reduce batch size or wait before retrying
- Check your OpenAI API usage dashboard

**Collection ID mismatch:**
- Ensure you're using the correct collection ID from Step 1
- List all collections: `GET /api/collections`

For more issues, see [Troubleshooting Guide](./troubleshooting.md).
