---
sidebar_position: 1
title: Core Concepts
---

# RAGler Core Concepts (AI Context)

## Definitions

- **Chunk**: The smallest unit of retrieval.
    - Properties: `id` (uuid), `content` (text), `vector` (embedding), `source_id` (hash).
- **Collection**: A logical container for chunks.
    - Implementation: A Qdrant collection named `kb_{uuid}`.
    - Metadata: Stored in `sys_registry` collection.
- **Session**: A temporary workspace for editing chunks.
    - Storage: Redis.
    - TTL: Ephemeral.
- **Atomic Replacement**: The strategy for updating documents.
    - Rule: Delete all chunks with `source_id` -> Insert new chunks.

## Constraints

- **No SQL**: Do not propose SQL migrations. Everything is Vector or Redis.
- **No Direct Qdrant Access**: Frontend talks to API; API talks to Qdrant.
