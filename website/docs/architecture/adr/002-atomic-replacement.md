---
title: ADR-002 Atomic Replacement
slug: /architecture/adr/002-atomic-replacement
---

# ADR-002: Atomic Replacement Strategy

**Status:** Accepted
**Date:** 2026-02-06
**Deciders:** Solution Architect, Development Team

## Context

In KMS-RAG, users can edit chunks in a draft session before publishing to the knowledge base. During editing, users may:
- **Split** one chunk into multiple smaller chunks
- **Merge** multiple chunks into one larger chunk
- **Edit** chunk content while preserving structure

**The Problem with Deterministic IDs:**

If chunks are identified by deterministic IDs (e.g., `{url}#{chunk_index}`):
1. User ingests document with chunks: `doc-1#0`, `doc-1#1`, `doc-1#2`
2. User merges chunks 0 and 1 → new structure: `doc-1#0` (merged), `doc-1#1` (was #2)
3. **On publish**: Old `doc-1#1` and `doc-1#2` remain in database as **orphaned garbage**

This creates:
- **Storage bloat**: Deleted chunks accumulate over time
- **Search pollution**: Outdated chunks appear in retrieval results
- **Inconsistent state**: Multiple versions of the same document coexist

The decision: How do we ensure clean database state when chunk structure changes?

## Decision

**Use Atomic Replacement: Delete all old chunks, then insert all new chunks in a two-step transaction.**

Implementation:
1. **Chunk ID**: Assign **random UUID v4** to each chunk on generation (not deterministic)
2. **Source tracking**: Connect all chunks of a document via `source_id` field (MD5 hash of source URL)
3. **Publish transaction**:
   ```typescript
   // Step 1: Delete all existing chunks from this document
   await qdrant.delete(collectionId, {
     filter: { must: [{ key: 'source_id', match: { value: sourceId } }] }
   });

   // Step 2: Insert all new chunks
   await qdrant.upsert(collectionId, newChunks);
   ```

## Rationale

### Why Random UUIDs

- **No ID collisions**: Merging/splitting doesn't reuse IDs accidentally
- **Clear ownership**: Each chunk has a unique identity independent of position
- **Audit trail**: Track which specific chunk was modified using immutable ID

### Why `source_id` Hash

- **Document-level tracking**: Group all chunks belonging to one source document
- **Efficient deletion**: Single filter query removes all chunks from a document
- **Deterministic grouping**: Same source URL always generates same `source_id`

### Why Two-Step Transaction

- **Guaranteed cleanliness**: Old chunks are removed before new ones arrive
- **No orphans**: Delete operation ensures no stale data remains
- **Idempotent**: Re-publishing the same document is safe (delete removes previous version)

### Why Alternative Approaches Were Rejected

**Incremental update (update/delete/insert per chunk):**
- ❌ Complex logic to diff old vs new chunk structure
- ❌ Partial failures leave inconsistent state
- ❌ Requires tracking which chunks were added/removed/modified

**Append-only with versioning:**
- ❌ Storage grows unbounded (need garbage collection)
- ❌ Search must filter by version (query complexity)
- ❌ Requires separate cleanup job

## Consequences

### Positive
- **Database cleanliness**: Guaranteed no orphaned chunks after publish
- **Simple publish logic**: Two operations (delete + upsert) regardless of edit complexity
- **Idempotent publishing**: Safe to re-publish same document multiple times
- **No ID management**: No need to coordinate deterministic IDs during split/merge
- **Clear audit trail**: `last_modified_by` and `revision` fields track who published

### Negative
- **Temporary unavailability**: Brief window where document chunks are deleted but not yet re-inserted (mitigated: publish is fast, <1 second)
- **Full re-indexing**: All chunks re-embedded even if only one changed (mitigated: cost is acceptable for MVP, optimize later if needed)
- **No partial rollback**: If upsert fails after delete, document is temporarily missing (mitigated: retry logic, transaction-like behavior)

### Neutral
- **Not true ACID**: Qdrant doesn't support multi-operation transactions (acceptable: delete+upsert is atomic enough for our use case)
- **Chunk history lost**: Previous versions not preserved (acceptable: MVP doesn't require version history)

## Alternatives Considered

### Alternative 1: Upsert with Deterministic IDs (Update in Place)

**Approach:** Use `{source_id}#{chunk_index}` as ID, update chunks in place

**Pros:**
- No delete operation needed
- Preserves existing chunks if unchanged

**Cons:**
- **Orphan problem**: Merging chunks leaves old IDs behind
- **Complex diff logic**: Must compute which chunks to add/update/delete
- **Merge conflicts**: What if user splits chunk 0 into 0a, 0b? ID collision with existing chunk 1

**Rejected because:** Cannot handle split/merge operations cleanly.

### Alternative 2: Soft Delete with Versioning

**Approach:** Mark old chunks as deleted via `is_active: false` field, append new versions

**Pros:**
- Preserves history for audit/rollback
- No data loss

**Cons:**
- **Storage bloat**: Old versions accumulate forever
- **Query complexity**: Every search must filter `is_active: true`
- **Garbage collection needed**: Requires background job to purge old versions
- **Performance degradation**: Search performance degrades as deleted chunks grow

**Rejected because:** Adds complexity MVP doesn't require (no version history needed yet).

### Alternative 3: Incremental Diff-Based Update

**Approach:** Compute diff (added/modified/deleted chunks) and apply minimal changes

**Pros:**
- Minimal writes to database
- Preserves unchanged chunks

**Cons:**
- **Complex diff algorithm**: Must match old chunks to new chunks (by content similarity?)
- **Edge cases**: Split/merge creates ambiguous mappings
- **Error-prone**: Diff logic bugs leave inconsistent state
- **No benefit for MVP**: Chunk count is small (<100 per document), full replacement is fast enough

**Rejected because:** Complexity outweighs benefits for MVP scale.

## Implementation Notes

### Source ID Generation
```typescript
import { createHash } from 'crypto';

function generateSourceId(sourceUrl: string): string {
  return createHash('md5').update(sourceUrl).digest('hex');
}
```

### Publish Transaction
```typescript
async function publishSession(sessionId: string, collectionId: string) {
  const session = await redis.get(`session:${sessionId}`);
  const sourceId = generateSourceId(session.source_url);

  // Step 1: Delete old chunks
  await qdrant.delete(collectionId, {
    filter: { must: [{ key: 'source_id', match: { value: sourceId } }] }
  });

  // Step 2: Insert new chunks
  const points = session.chunks.map(chunk => ({
    id: uuid.v4(),
    vector: chunk.embedding,
    payload: {
      content: chunk.text,
      source_id: sourceId,
      source_url: session.source_url,
      last_modified_by: session.user_id,
      last_modified_at: new Date().toISOString(),
      revision: session.revision + 1
    }
  }));

  await qdrant.upsert(collectionId, { points });
}
```

## References

- [Solution Architecture Document v2.1](/docs/sad.md) - Section 4.2: Chunk Lifecycle
- [Product: Publishing Workflow](/docs/product/publishing)
- Related ADR: [ADR-001: Vector-Only Storage](/docs/architecture/adr/001-vector-only-storage)
- [Qdrant Delete API](https://qdrant.tech/documentation/concepts/points/#delete-points)
- [Qdrant Upsert API](https://qdrant.tech/documentation/concepts/points/#upload-points)
