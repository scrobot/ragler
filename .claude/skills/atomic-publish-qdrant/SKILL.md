---
name: atomic-publish-qdrant
description: Guarantees clean publishing without duplicates
---

Publish algorithm:
1. Identify source_id
2. DELETE from Qdrant where payload.source_id == source_id
3. UPSERT all new chunks
4. Increment revision
5. Set audit fields (user, timestamp)

Rules:
- Chunk IDs are random UUIDs
- Never update individual chunks in-place
- Publish must be idempotent