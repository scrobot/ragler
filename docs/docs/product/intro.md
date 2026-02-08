---
sidebar_position: 1
title: Introduction
---

# Introduction to RAGler

## Document Purpose

This document describes business and functional requirements for a knowledge management product for RAG (Retrieval-Augmented Generation). It reflects the evolution of the product considering research, user roles, and the need for a user-friendly interface.

## Product Goals

- Ensure managed population and development of RAG context
- Make working with RAG data accessible not only to ML specialists, but also to developers and L2 support
- Reduce team dependency on ML experts when tuning knowledge
- Ensure a transparent and reproducible process for improving LLM answer quality

## Scope

**Within scope:**
- Data upload and preparation for RAG
- Management of chunks and collections
- Knowledge enrichment with LLM and user participation
- Different modes of operation depending on user role
- User scenarios for improving RAG responses

**Out of scope:**
- Architecture and infrastructure details (see Architecture docs)
- ML algorithms and retrieval strategies
- Non-functional requirements
- Answer quality monitoring in production

## Key Concepts

- **Data Source** — initial material from which knowledge is formed
- **Chunk** — atomic unit of knowledge used in RAG
- **Collection** — logical grouping of chunks describing the context of their use
- **Enrichment** — adding clarifying or structuring context to a chunk
- **Mode of Operation** — variant of user interface and available actions depending on role

## MVP Scope

This section defines the minimum viable product (MVP) functionality required to deliver practical value.

### In Scope

#### Data Sources
- Manual source addition
- Document import from Confluence (single document via link)
- Import from web URLs
- Store source as separate entity
- Manual re-processing of sources

#### Chunking
- Automatic LLM-powered splitting
- Visual display of chunk boundaries
- Text editing (all roles)
- Split/merge operations (Advanced Mode only)

#### Knowledge Enrichment
- Manual context addition
- LLM assistant scenarios:
  - Text simplification
  - Terminology clarification
  - Adding examples
  - Audience-specific rewriting
- Explicit user confirmation required

#### Collections
- Create and edit collections
- Mandatory purpose and audience specification
- Chunk assignment before saving

#### Roles and Modes
- Three roles: ML Specialist, Developer, L2 Support
- Two modes: Simple Mode, Advanced Mode
- Functionality restrictions per [Capabilities Matrix](/docs/product/roles#capabilities-matrix)

#### User Scenarios
- All [primary workflows](/docs/product/flows/intro) must be fully functional

### Out of Scope (Consciously Deferred)

The following are **explicitly excluded** from MVP:
- Real-time Confluence synchronization
- Bulk document scanning
- Automatic chunk quality assessment
- Retrieval metrics and analytics
- A/B testing of RAG answers
- Automatic knowledge updates on source changes
- Chunk version management
- Bulk operations in Simple Mode

### MVP Completion Criteria

MVP is complete when:
- ✅ All primary workflows execute end-to-end
- ✅ Users of all roles can complete scenarios independently
- ✅ Knowledge can be uploaded, edited, enriched, and saved without ML specialist involvement

## Success Criteria

The product is successful if:
- **Democratization**: Developers and L2 Support can independently improve RAG context
- **Reduced bottlenecks**: ML Specialists are not required for routine knowledge updates
- **Transparency**: Knowledge enrichment process is auditable and reproducible
- **Quality improvement**: RAG answer quality improves through structured HITL workflows
