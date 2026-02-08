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

| Action | ML Specialist | Developer | L2 Support |
|--------|---------------|-----------|------------|
| Create source | Yes | Yes | Yes |
| Split/Merge chunks | Yes | Yes | **No** |
| Edit chunk text | Yes | Yes | Yes |
| Manage Collections | Yes | Yes | **No** |
