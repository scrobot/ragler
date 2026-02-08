---
sidebar_position: 2
title: Roles and Modes
---

# User Roles and Modes

## User Roles

### ML Specialist
- **Characteristics:** Deep understanding of RAG, experimentation.
- **Tasks:** Chunk structure control, enrichment analysis, collection strategy.

### Developer (Backend / Platform)
- **Characteristics:** Understands RAG concepts but avoids ML details.
- **Tasks:** Improve answers for specific scenarios, clarify formulations.

### L2 Support
- **Characteristics:** Context experts, no RAG mechanics knowledge required.
- **Tasks:** Fix inaccuracies, simplify texts for clients.

## Modes of Operation

### Advanced Mode
- **Target:** ML Specialists, Developers.
- **Features:**
  - Full access to chunk structure (split/merge).
  - Extended LLM scenarios.
  - Raw JSON/Vector inspection.

### Simple Mode
- **Target:** L2 Support.
- **Features:**
  - Focus on text meaning.
  - No split/merge operations.
  - Guided wizard flows.

## Capabilities Matrix

The table below specifies which actions are available to users depending on their role. This matrix serves as a contract between product requirements, architecture design, and implementation.

### Full Capabilities

| Action | ML Specialist | Developer | L2 Support | Notes |
|--------|---------------|-----------|------------|-------|
| Create source (upload document / URL / manual input) | ✅ | ✅ | ✅ | All roles can add data sources |
| Import document via Confluence link | ✅ | ✅ | ✅ | All roles can ingest from Confluence |
| View entire original source | ✅ | ✅ | ✅ | All roles can inspect source documents |
| Run source re-processing | ✅ | ✅ | ❌ | L2 cannot trigger re-chunking |
| View chunk splitting result | ✅ | ✅ | ✅ | All roles can see chunking results |
| Edit chunk boundaries (split / merge) | ✅ | ✅ | ❌ | Advanced Mode only |
| Edit chunk text | ✅ | ✅ | ✅ | All roles can modify text content |
| Add context to chunk manually | ✅ | ✅ | ✅ | All roles can enrich chunks |
| Use LLM assistant (scenarios) | ✅ | ✅ | ✅ | All roles can use AI enrichment |
| Select and change collection for chunk | ✅ | ✅ | ✅ | All roles can assign collections |
| Create and edit collections | ✅ | ✅ | ❌ | L2 cannot manage collections |
| Change collection purpose and description | ✅ | ✅ | ❌ | L2 cannot modify collection metadata |
| Save chunks as ready for use | ✅ | ✅ | ✅ | All roles can publish |
| Bulk operations with chunks | ✅ | ❌ | ❌ | ML Specialists only |

### Mode-Based Limitations

**Simple Mode (L2 Support):**
- System does not require understanding of chunk structure
- Split/merge operations are unavailable
- Interaction with chunks is through scenarios and simplified editing forms
- User works only with final text and enriched context

**Advanced Mode (ML Specialist, Developer):**
- Full chunk structure is visible
- Structure change operations are available
- Extended LLM assistant scenarios are accessible
- Bulk operations available (ML Specialists only)
