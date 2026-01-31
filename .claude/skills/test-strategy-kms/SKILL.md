---
name: test-strategy-kms
description: Defines testing strategy for KMS-RAG
---

Required tests:
- unit tests for services
- integration tests for:
  - ingest → chunk → edit → preview → publish
  - role restrictions
  - atomic publish cleanup

Rules:
- Prefer real Redis + Qdrant via docker-compose
- Do not over-mock infrastructure
- Tests are part of Definition of Done