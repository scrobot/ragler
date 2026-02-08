---
sidebar_position: 1
title: Architecture Decision Records
---

# Architecture Decision Records (ADR)

## 1. Dynamic Collections
- **Decision:** Use Qdrant `sys_registry` collection for metadata.
- **Why:** Avoids needing SQL DB for just one table.

## 2. Chunk Lifecycle
- **Decision:** Atomic Replacement (Delete + Insert).
- **Why:** Prevents orphaned chunks when users merge/split.
