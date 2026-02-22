# Business Requirements Document (BRD)

## Purpose

Define what RAGler must deliver from a product perspective for knowledge operations in RAG systems.

## Product Goals

- Let teams ingest knowledge from multiple source types.
- Keep humans in control of chunk quality before publish.
- Maintain organized collections for predictable retrieval.
- Support continuous improvement of published knowledge.

## In Scope

- Source ingestion (Confluence, web, manual)
- Source ingestion from file uploads (PDF, DOCX, MD, TXT, CSV)
- Draft session editing workflow
- Collection management
- Publish and search workflows
- Collection editor and AI-assisted maintenance
- Document lineage tracking (document → chunks)
- Configurable chunking strategy (LLM or character-based)
- Knowledge browsing with document grouping and filtering
- Integrated chat playground for published collections

## Out of Scope

- Full enterprise IAM design
- Real-time source synchronization
- Production SLO/SLA policy definition

## Key Concepts

- `Source`: raw content input.
- `Session`: temporary draft workspace.
- `Chunk`: retrievable unit of knowledge.
- `Collection`: published knowledge context.
- `Publish`: commit from session to collection.

## Primary User Flows

1. Ingest source -> generate chunks -> review/edit -> preview -> publish.
2. Open collection -> update chunks -> validate by search.
3. Use AI assistance for quality analysis and suggested operations.

## Functional Requirements Summary

- FR-BRD-001: Support ingestion from Confluence, web, and manual text.
- FR-BRD-002: Support session-based chunk operations (edit, split, merge).
- FR-BRD-003: Require explicit user confirmation before publish.
- FR-BRD-004: Support collection CRUD and direct chunk editing in collections.
- FR-BRD-005: Support semantic search over published collections.
- FR-BRD-006: Provide AI-assisted collection quality suggestions with approval flow.
- FR-BRD-007: Support file upload ingestion (PDF, DOCX, DOC, TXT, MD, CSV) up to 10 MB.
- FR-BRD-008: Track document lineage metadata (filename, size, mime type, ingest date).
- FR-BRD-009: Provide document-level browsing grouped by source with quality aggregation.
- FR-BRD-010: Support configurable chunking (LLM semantic or character-based with overlap).
- FR-BRD-011: Support chunk filtering by source type, source ID, quality score, and tags.
- FR-BRD-012: Provide RAG-powered chat playground with conversation history per collection.

## Acceptance Criteria

- End-to-end ingest-to-publish works for each source type.
- Published knowledge is searchable by collection.
- Users can improve existing collection chunks without re-ingesting.
