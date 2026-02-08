---
title: ADR-001 Vector-Only Storage
slug: /architecture/adr/001-vector-only-storage
---

# ADR-001: Vector-Only Storage (Qdrant-First Architecture)

**Status:** Accepted
**Date:** 2026-02-06
**Deciders:** Solution Architect, Development Team

## Context

KMS-RAG is a knowledge management system for RAG (Retrieval-Augmented Generation) that requires storing both vector embeddings for semantic search and metadata about knowledge collections. Traditional RAG systems use a hybrid architecture:
- **Relational database (PostgreSQL/MySQL)** for metadata (collection registry, user info, audit logs)
- **Vector database (Qdrant/Pinecone)** for embeddings and chunk content

This hybrid approach introduces:
- **Infrastructure complexity**: Two databases to deploy, monitor, backup
- **Consistency challenges**: Maintaining referential integrity across systems
- **Operational overhead**: Two connection pools, two failure modes, two monitoring systems
- **Development friction**: Schema migrations in two places

The decision: Should we use a traditional hybrid architecture or adopt a vector-first approach?

## Decision

**Reject SQL entirely. Store all data—both vectors and metadata—exclusively in Qdrant.**

Specifically:
1. **Chunk content and embeddings** → Qdrant collections named `data_{collection_uuid}`
2. **Collection metadata** → Qdrant system collection `sys_registry` with schema:
   ```json
   {
     "id": "collection-uuid",
     "payload": {
       "name": "Business Logic Knowledge",
       "description": "...",
       "created_by": "user_id",
       "created_at": "2026-02-06T10:00:00Z"
     }
   }
   ```

## Rationale

### Why Qdrant Can Replace SQL for Our Use Case

1. **Metadata volume is tiny**: Collection registry has ~10-100 entries (not millions)
2. **No complex joins**: Metadata queries are simple lookups by `collection_id` or `created_by`
3. **Qdrant payload filtering**: Supports efficient filtering on JSON payload fields
4. **Audit trail via payloads**: `last_modified_by`, `last_modified_at` stored alongside content

### Why This Simplifies the System

1. **Single infrastructure component**: Deploy only Qdrant—no PostgreSQL
2. **Unified connection management**: One client, one connection pool
3. **Consistent backup strategy**: Snapshot Qdrant collections for all data
4. **Simplified schema evolution**: Payload schema is flexible (JSON)
5. **Reduced latency**: Metadata retrieval doesn't require cross-database lookups

### Why Traditional Hybrid Was Rejected

Traditional approach would require:
- **PostgreSQL for 1 table** (`collections` registry) — infrastructure overkill for 10-100 rows
- **Cross-database transactions**: Publishing chunks + updating metadata would need distributed transaction handling
- **Deployment complexity**: Kubernetes manifests, environment variables, secrets for two databases

## Consequences

### Positive
- **Infrastructure stays flat**: One vector database handles all persistence
- **Deployment simplicity**: Docker Compose runs only Redis + Qdrant (no SQL)
- **Operational simplicity**: Single backup/restore process
- **No schema migrations**: Payload schema evolves without ALTER TABLE DDL
- **Cost efficiency**: One database license/instance instead of two

### Negative
- **No ACID transactions**: Qdrant doesn't provide multi-collection transactions (mitigated: our use case doesn't need them)
- **Limited query complexity**: Can't perform SQL JOINs or complex aggregations (mitigated: our queries are simple lookups)
- **Analytics limitations**: Reporting tools expect SQL (mitigated: export to analytics warehouse if needed later)
- **Vendor lock-in to Qdrant**: Payload filtering is Qdrant-specific (mitigated: open-source, self-hostable)

### Neutral
- **Unconventional architecture**: Deviates from typical SQL + Vector DB pattern (requires documentation for new developers)
- **Search performance**: Collection metadata queries use vector DB filtering instead of SQL indexes (acceptable given low volume)

## Alternatives Considered

### Alternative 1: PostgreSQL + Qdrant (Traditional Hybrid)

**Pros:**
- Industry-standard pattern
- Rich SQL query capabilities
- Strong ACID guarantees

**Cons:**
- **Infrastructure bloat**: PostgreSQL for 1-2 tables is overkill
- **Deployment complexity**: Two databases to configure, secure, monitor
- **Consistency overhead**: Cross-database updates require coordination

**Rejected because:** Operational complexity outweighs benefits for our small metadata footprint.

### Alternative 2: MongoDB + Qdrant (NoSQL Hybrid)

**Pros:**
- Flexible schema like Qdrant payloads
- Better for metadata than SQL

**Cons:**
- **Still two databases**: Doesn't solve infrastructure complexity
- **No semantic search**: MongoDB can't replace Qdrant for vectors
- **Cost**: Additional database instance

**Rejected because:** Doesn't eliminate the two-database problem.

### Alternative 3: Store Metadata in Application Memory (Redis)

**Pros:**
- Fast lookups
- Already using Redis for sessions

**Cons:**
- **Data loss risk**: Redis is ephemeral (session cache), not durable storage
- **No persistence guarantees**: Collection registry must survive restarts
- **Not designed for this**: Redis is a cache, not a primary data store

**Rejected because:** Collection metadata is critical system state requiring durability.

## References

- [Solution Architecture Document v2.1](/docs/sad.md) - Section 4.1: Dynamic Collections
- [Qdrant Filtering Documentation](https://qdrant.tech/documentation/concepts/filtering/)
- [Architecture Overview](/docs/architecture/overview)
- Related ADR: [ADR-002: Atomic Replacement Strategy](/docs/architecture/adr/002-atomic-replacement)
