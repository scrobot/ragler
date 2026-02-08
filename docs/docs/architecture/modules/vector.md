---
title: Vector Module
sidebar_position: 5
---

# Module: Vector

## Purpose

The **Vector module** provides a clean abstraction layer over Qdrant operations, managing vector collections, chunk storage, search, and the atomic replacement pattern for publishing.

## Architecture

### Components

**Key Classes:**
- `VectorService` - Core service for all Qdrant operations
- `VectorController` - HTTP API for search and retrieval
- `PayloadDto`, `VectorDto` - Data transfer objects for Qdrant payloads

**Design Pattern:**
- **Repository Pattern** - Abstracts Qdrant implementation details
- **Atomic Operations** - Delete-Insert pattern for consistency
- **Filter Builder** - Type-safe query construction

### Dependencies

**Internal:**
- None (leaf module - no internal dependencies)

**External:**
- **Qdrant** - Vector database for embeddings and content
  - Collections: `sys_registry` (collection metadata) + `kb_{uuid}` (data collections)
  - Client: `@qdrant/js-client-rest`

### Integration Points

**Used By:**
- `CollectionModule` - Collection CRUD operations
- `SessionModule` - Publishing chunks to Qdrant
- MCP Server - Search knowledge for AI agents
- Frontend SPA - Search and retrieval

**Exposes:**
- `createCollection(name)` - Create new Qdrant collection
- `deleteCollection(id)` - Remove collection
- `upsertPoints(collectionId, points)` - Insert/update chunks
- `deletePoints(collectionId, filter)` - Remove chunks by filter
- `search(collectionId, query, filters)` - Semantic search
- `getPoint(collectionId, pointId)` - Retrieve single chunk
- `scroll(collectionId, filter)` - Paginated retrieval

## Key Concepts

### Collection Naming Convention

**System Collections:**
- `sys_registry` - Stores collection metadata (hardcoded name)

**Data Collections:**
- Pattern: `kb_{collection_uuid}`
- Example: `kb_a1b2c3d4-e5f6-7890-abcd-ef1234567890`

**Why UUID in name:**
- Avoids name collisions
- Allows collection renaming (update sys_registry, keep Qdrant collection)
- Simplifies cleanup (delete collection by UUID)

### Qdrant Point Schema

**Point Structure:**
```typescript
interface QdrantPoint {
  id: string;                  // UUID v4 (Random)
  vector: number[];            // [1536] from text-embedding-3-small
  payload: ChunkPayload;
}
```

**Payload Schema:**
```typescript
interface ChunkPayload {
  // Core Content
  content: string;             // Chunk text

  // Source Tracking
  source_id: string;           // MD5(sourceUrl) - for atomic replacement
  source_url: string;          // Original URL
  source_type: 'confluence' | 'web' | 'manual';

  // Context & Metadata
  context_breadcrumbs?: string; // "Introduction > Getting Started"
  heading?: string;            // Section heading
  tags?: string[];             // Auto-extracted or manual tags

  // Audit Trail
  last_modified_by: string;    // User email/ID
  last_modified_at: string;    // ISO-8601 timestamp
  revision: number;            // Incremented on each update

  // Collection Association
  collection_id: string;       // UUID of owning collection
}
```

**Key Fields:**

| Field | Purpose | Example |
|-------|---------|---------|
| `source_id` | Group chunks from same source (atomic replacement) | `a1b2c3d4e5f6` (MD5 hash) |
| `source_url` | Original source for re-ingestion | `https://confluence.../page/123` |
| `context_breadcrumbs` | Hierarchical context | `"API > Authentication > OAuth"` |
| `last_modified_by` | Audit trail | `dev@company.com` |
| `revision` | Version tracking | `1` (incremented on update) |

### Atomic Replacement Pattern

**Problem:** When re-ingesting a source, chunks may change (split, merge, edit). How to avoid duplicates?

**Solution:** Delete all old chunks, insert all new chunks (atomic transaction)

**Implementation:**
```typescript
async atomicReplace(collectionId: string, sourceId: string, newChunks: Chunk[]) {
  // Step 1: Delete all chunks with matching source_id
  await qdrant.delete(collectionId, {
    filter: {
      must: [
        {
          key: 'source_id',
          match: { value: sourceId }
        }
      ]
    }
  });

  // Step 2: Insert new chunks
  await qdrant.upsert(collectionId, {
    points: newChunks.map(chunk => ({
      id: uuidv4(),
      vector: chunk.embedding,
      payload: {
        content: chunk.content,
        source_id: sourceId,
        // ... other fields
      }
    }))
  });
}
```

**Guarantees:**
- ✅ No duplicate chunks (old ones deleted first)
- ✅ Clean replacement (no orphaned data)
- ✅ Consistent state (delete + insert wrapped in transaction)

**Trade-offs:**
- ❌ Brief moment where source has no chunks (during delete-insert)
- ✅ Acceptable for RAGler use case (draft-commit workflow)

### Search Operations

#### Semantic Search

**Use Case:** Find relevant chunks for user query

**API:**
```http
POST /vector/search
Content-Type: application/json

{
  "query": "How do I authenticate API requests?",
  "collectionName": "API Documentation",
  "limit": 10,
  "filters": {
    "tags": ["authentication", "api"]
  }
}
```

**Implementation:**
```typescript
async search(collectionId: string, queryText: string, options: SearchOptions) {
  // Generate query embedding
  const queryEmbedding = await llmService.generateEmbedding(queryText);

  // Build filters
  const filter = this.buildFilter(options.filters);

  // Perform vector search
  const results = await qdrant.search(collectionId, {
    vector: queryEmbedding,
    limit: options.limit || 10,
    filter: filter,
    with_payload: true,
    with_vector: false
  });

  return results.map(result => ({
    id: result.id,
    content: result.payload.content,
    score: result.score,
    metadata: result.payload
  }));
}
```

**Search Parameters:**
- `query` - Natural language query
- `limit` - Max results (default 10, max 100)
- `filters` - Optional metadata filters (tags, source_type, etc.)
- `scoreThreshold` - Min similarity score (0-1)

**Response:**
```json
{
  "results": [
    {
      "id": "uuid-1",
      "content": "API authentication uses X-User-ID and X-User-Role headers...",
      "score": 0.92,
      "metadata": {
        "source_url": "https://confluence.../authentication",
        "context_breadcrumbs": "API > Authentication",
        "last_modified_at": "2026-02-08T10:00:00Z"
      }
    }
  ],
  "total": 1
}
```

#### Filtered Search

**Use Case:** Search within specific source or tag

**Example: Find chunks from specific source**
```typescript
const chunks = await vectorService.scroll('kb_uuid', {
  filter: {
    must: [
      {
        key: 'source_id',
        match: { value: 'a1b2c3d4e5f6' }
      }
    ]
  }
});
```

**Example: Find chunks with specific tags**
```typescript
const chunks = await vectorService.search('kb_uuid', 'authentication', {
  filters: {
    tags: ['api', 'oauth']
  }
});
```

### Collection Operations

#### Create Collection

**Implementation:**
```typescript
async createCollection(collectionName: string) {
  await qdrant.createCollection(collectionName, {
    vectors: {
      size: 1536,               // text-embedding-3-small dimensions
      distance: 'Cosine'        // Similarity metric
    }
  });
}
```

**Vector Configuration:**
- **Size:** 1536 (matches OpenAI text-embedding-3-small)
- **Distance:** Cosine similarity (standard for embeddings)
- **Indexing:** HNSW (Hierarchical Navigable Small World) - fast approximate search

#### Delete Collection

**Implementation:**
```typescript
async deleteCollection(collectionName: string) {
  // Check if collection exists
  const exists = await qdrant.collectionExists(collectionName);

  if (!exists) {
    throw new CollectionNotFoundError(collectionName);
  }

  // Delete collection (all points removed)
  await qdrant.deleteCollection(collectionName);
}
```

**Cascade Behavior:**
- Deletes collection from Qdrant
- All points in collection are removed
- Irreversible operation

### Batch Operations

#### Bulk Upsert

**Use Case:** Publish entire session (multiple chunks at once)

**Implementation:**
```typescript
async bulkUpsert(collectionId: string, chunks: ChunkWithEmbedding[]) {
  const points = chunks.map(chunk => ({
    id: uuidv4(),
    vector: chunk.embedding,
    payload: {
      content: chunk.content,
      source_id: chunk.sourceId,
      // ... other fields
    }
  }));

  // Batch insert (up to 1000 points per request)
  const batchSize = 1000;
  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize);
    await qdrant.upsert(collectionId, {
      points: batch,
      wait: true  // Wait for indexing
    });
  }
}
```

**Batch Limits:**
- Max 1000 points per upsert request
- For larger sessions: split into batches
- Use `wait: true` to ensure indexing completes

#### Scroll (Paginated Retrieval)

**Use Case:** Retrieve all chunks in collection (no search query)

**Implementation:**
```typescript
async scrollCollection(collectionId: string, filter?: Filter) {
  const allPoints = [];
  let offset = null;

  do {
    const response = await qdrant.scroll(collectionId, {
      filter: filter,
      limit: 100,
      offset: offset,
      with_payload: true,
      with_vector: false
    });

    allPoints.push(...response.points);
    offset = response.next_page_offset;
  } while (offset !== null);

  return allPoints;
}
```

**Use Cases:**
- List all chunks in collection
- Export collection data
- Validate published chunks

## Data Model

### Upsert Request DTO

```typescript
interface UpsertChunksDto {
  collectionId: string;
  chunks: ChunkWithEmbedding[];
  sourceId: string;             // For atomic replacement tracking
  userId: string;               // For audit trail
}

interface ChunkWithEmbedding {
  content: string;
  embedding: number[];          // [1536] vector
  metadata?: {
    heading?: string;
    tags?: string[];
    contextBreadcrumbs?: string;
  };
}
```

### Search Request DTO

```typescript
interface SearchDto {
  query: string;                // Natural language query
  collectionName: string;       // Collection to search
  limit?: number;               // Max results (default 10)
  scoreThreshold?: number;      // Min score (0-1)
  filters?: {
    sourceType?: 'confluence' | 'web' | 'manual';
    tags?: string[];
    sourceId?: string;
  };
}
```

### Search Response DTO

```typescript
interface SearchResultDto {
  results: SearchResult[];
  total: number;
  query: string;
  executionTime: number;        // milliseconds
}

interface SearchResult {
  id: string;
  content: string;
  score: number;                // Similarity score (0-1)
  metadata: {
    source_url: string;
    context_breadcrumbs?: string;
    heading?: string;
    tags?: string[];
    last_modified_by: string;
    last_modified_at: string;
  };
}
```

## Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `QDRANT_CONNECTION_FAILED` | Qdrant server unreachable | Check Qdrant health, verify `QDRANT_URL` |
| `COLLECTION_NOT_FOUND` | Collection does not exist | Verify collection name, check sys_registry |
| `POINT_NOT_FOUND` | Point ID does not exist | Verify point ID from search results |
| `VECTOR_DIMENSION_MISMATCH` | Embedding size != 1536 | Check LLM embedding model configuration |
| `BULK_UPSERT_FAILED` | Batch insert failed | Retry failed batch, check Qdrant logs |
| `SEARCH_TIMEOUT` | Query exceeded timeout | Increase timeout, optimize filters |
| `INVALID_FILTER` | Malformed filter query | Validate filter structure |

### Retry Strategy

**Transient Failures:**
- Connection timeout → Retry 3 times with exponential backoff (1s, 2s, 4s)
- Network errors → Circuit breaker pattern
- Rate limits → Wait and retry

**Non-Retryable Failures:**
- Collection not found → User must create collection
- Invalid filter → User must fix query
- Dimension mismatch → Configuration error (fix embedding model)

### Circuit Breaker

**Configuration:**
```typescript
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,          // Open after 5 failures
  resetTimeout: 60000,          // Try again after 60s
  monitorInterval: 10000        // Check health every 10s
});
```

**States:**
- **Closed:** Normal operation
- **Open:** Too many failures, reject requests immediately
- **Half-Open:** Test if service recovered

## Configuration

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `QDRANT_URL` | Qdrant server URL | `http://localhost:6333` |
| `QDRANT_API_KEY` | API authentication (optional) | `` |
| `QDRANT_TIMEOUT` | Request timeout (ms) | `30000` |
| `QDRANT_BATCH_SIZE` | Max points per upsert | `1000` |
| `QDRANT_SEARCH_LIMIT` | Default search limit | `10` |
| `QDRANT_MAX_SEARCH_LIMIT` | Max search results | `100` |
| `VECTOR_DIMENSIONS` | Embedding size | `1536` |
| `VECTOR_DISTANCE_METRIC` | Similarity metric | `Cosine` |

### Collection Configuration

**Vector Index (HNSW):**
```typescript
{
  m: 16,                        // Max connections per node
  ef_construct: 100,            // Construction time accuracy
  ef: 128                       // Search time accuracy
}
```

**Performance Tuning:**
- `m` higher → Better recall, more memory
- `ef_construct` higher → Better index quality, slower indexing
- `ef` higher → Better search accuracy, slower queries

## Testing Strategy

### Unit Tests

**Location:** `test/unit/vector/vector.service.spec.ts`

**Coverage:**
- Collection creation and deletion
- Point upsert and delete
- Search operations
- Filter building
- Atomic replacement
- Error handling

**Key Test Cases:**
```typescript
describe('VectorService', () => {
  describe('Atomic Replacement', () => {
    it('should delete old chunks before inserting new ones');
    it('should use source_id for filtering');
    it('should handle empty new chunks (delete only)');
  });

  describe('Search', () => {
    it('should return results sorted by score');
    it('should apply metadata filters correctly');
    it('should handle empty results gracefully');
  });

  describe('Bulk Operations', () => {
    it('should batch upserts for >1000 points');
    it('should handle partial batch failures');
  });
});
```

### Integration Tests

**Location:** `test/app.e2e-spec.ts`

**Coverage:**
- Full publish workflow (session → Qdrant)
- Search accuracy
- Atomic replacement verification
- Qdrant health integration

**Key Test Cases:**
```typescript
describe('Vector E2E', () => {
  it('should publish chunks and make them searchable');
  it('should replace old chunks on re-publish (same source_id)');
  it('should find chunks by semantic similarity');
  it('should filter results by metadata');
  it('should handle Qdrant connection failures gracefully');
});
```

## Related Documentation

- [Product: Publishing](/docs/product/publishing) - User-facing publish workflow
- [Architecture: Session Module](/docs/architecture/modules/session) - Draft editing before publish
- [Architecture: LLM Module](/docs/architecture/modules/llm) - Embedding generation
- [Architecture: Data Model](/docs/architecture/data-model) - Complete payload schema
- [ADR-001: Vector-Only Storage](/docs/architecture/adr/001-vector-only-storage) - Why Qdrant for everything
- [ADR-002: Atomic Replacement](/docs/architecture/adr/002-atomic-replacement) - Delete-Insert pattern
