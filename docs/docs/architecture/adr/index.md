---
sidebar_position: 1
title: Architecture Decision Records
---

# Architecture Decision Records (ADR)

This page provides a summary of key architectural decisions. Click links for detailed rationale.

## [ADR-001: Vector-Only Storage](/docs/architecture/adr/001-vector-only-storage)
- **Status:** Accepted
- **Decision:** Reject SQL entirely. Store all data (vectors + metadata) exclusively in Qdrant.
- **Rationale:** Simplifies infrastructure by using Qdrant `sys_registry` collection for metadata instead of PostgreSQL.
- **Impact:** Single database to deploy, monitor, and backup. No cross-database consistency issues.

## [ADR-002: Atomic Replacement Strategy](/docs/architecture/adr/002-atomic-replacement)
- **Status:** Accepted
- **Decision:** Use Delete-Insert pattern for document updates (atomic replacement).
- **Rationale:** Prevents orphaned chunks when users split/merge during editing.
- **Impact:** Guaranteed database cleanliness. Chunks identified by random UUID + `source_id` hash.

## [ADR-003: Two LLMs Pattern](/docs/architecture/adr/003-two-llms)
- **Status:** Accepted
- **Decision:** Use GPT-4o for chunking, GPT-4o-mini for enrichment.
- **Rationale:** Balance quality and cost—use premium model for high-stakes chunking, cost-optimized model for simple text transformations.
- **Impact:** 60% cost reduction vs GPT-4o-only. Reliable chunking + fast enrichment.

## [ADR-004: Redis Session TTL](/docs/architecture/adr/004-redis-session-ttl)
- **Status:** Accepted
- **Decision:** Set 24-hour TTL on draft sessions in Redis, extend on activity.
- **Rationale:** Prevent memory bloat while allowing same-day editing workflows.
- **Impact:** Bounded Redis memory usage. Users have 24 hours to complete drafts.
