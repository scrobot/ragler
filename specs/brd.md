# Business Requirements Document (BRD v3)

## 1. General Information

### 1.1 Document Purpose

This document describes business and functional requirements for a knowledge management product for RAG (Retrieval-Augmented Generation). The document reflects the evolution from initial versions, focusing on a streamlined user experience for knowledge management.

The document describes **what the system should do**, without describing architecture, technology stack, or non-functional requirements.

---

### 1.2 Product Goals

- Ensure managed population and development of RAG context
- Make working with RAG data accessible to all team members
- Ensure a transparent and reproducible process for improving LLM answer quality
- Provide intuitive tools for knowledge enrichment without specialized ML expertise

---

### 1.3 Scope

Within the product:

- Data upload and preparation for RAG
- Management of chunks and collections
- Knowledge enrichment with LLM and user participation
- User scenarios for improving RAG responses

Out of scope:

- Architecture and infrastructure
- ML algorithms and retrieval strategies
- Non-functional requirements
- Answer quality monitoring in production

---

## 2. Key Concepts

- **Data Source** — initial material from which knowledge is formed
- **Chunk** — atomic unit of knowledge used in RAG
- **Collection** — logical grouping of chunks describing the context of their use
- **Enrichment** — adding clarifying or structuring context to a chunk
- **Session** — temporary workspace for editing chunks before publishing

---

## 3. Collections Concept

### 3.1 Purpose of a Collection

A collection represents a **context of knowledge use**, not just a set of chunks.

Each collection should describe:

- Which audience the knowledge is intended for
- In which scenarios it is used
- What style and level of detail is expected

---

### 3.2 Collection Management

The system should allow:

- Creating collections with description of purpose
- Editing collection description and parameters
- Managing chunk composition within a collection
- Preventing implicit loss of chunks when deleting a collection

---

### 3.3 Collection Editor

The system should provide a dedicated interface for managing published knowledge:

- Viewing all chunks within a collection with search and filtering
- Direct editing of published chunk content
- Creating new chunks directly within a collection
- Deleting chunks from a collection
- Splitting chunks into multiple parts
- Merging multiple chunks into one
- Manual reordering of chunks for retrieval optimization
- AI-assisted collection quality analysis
- AI-suggested chunk operations (split, merge, rewrite)
- Quality scoring per chunk to identify improvement opportunities

All AI suggestions must be presented for user approval before application (HITL model).

---

## 4. Data Source Types

### 4.1 General Concept of Sources

A data source is a primary entity representing logically complete material from which chunks of knowledge are formed.

The system should:

- Support multiple types of data sources
- Maintain relationship between source and generated chunks
- Allow re-processing of source at user's initiative

---

### 4.2 Data Source Types

#### 4.2.1 Document Sources

Description: Document sources are static documents used to form the knowledge base.

Supported scenarios:

- Document upload by user
- Document import via link

The system should support importing documents from Confluence via a user-provided link.

Functional requirements:

- User should be able to specify a link to a document in Confluence
- System should extract the content of the specified document
- Extracted document should be saved as a separate data source
- Data source should be available for subsequent processing and re-processing

Limitations:

- System should not perform real-time synchronization with Confluence
- System should not perform bulk scanning of Confluence spaces or all documents

---

#### 4.2.2 URL / Web Pages

Description: Sources represented by content accessible via URL.

Functional requirements:

- User should be able to specify a URL
- System should extract text content of the page
- Content is saved as a data source

---

#### 4.2.3 Manual Input

Description: A source created by user directly in the system.

Functional requirements:

- User should be able to create a source manually
- Entered content is saved as a data source

---

## 5. Functional Requirements

### 5.1 Data Upload and Preparation

- System should allow uploading data from various sources
- System should split data into chunks
- Chunks should be saved in intermediate state before enrichment

---

### 5.2 Splitting Sources into Chunks

- System should use LLM to split source into chunks
- Split result should be presented to user in visual form
- User should see chunk boundaries and their content
- User should be able to edit split result before enrichment

Chunk editing should include:

- Merging chunks
- Splitting chunks
- Text correction within chunk

---

### 5.3 Chunk Enrichment and LLM Assistant

- System should allow user to manually add context to chunk
- System should provide LLM assistant with predefined enrichment scenarios
- User must explicitly confirm application of enrichment results

LLM assistant should support scenarios:

- Text simplification for selected audience
- Terminology clarification
- Adding clarifying examples
- Identifying ambiguous formulations
- Text rewriting for target audience

---

### 5.4 Preview and Saving

- User should be able to select collection for chunks
- System should provide preview of final version of chunks
- User should be able to return to editing
- Chunk saving should require user confirmation
- Confirmed chunks are saved as ready for use

---

## 6. Primary User Flows (Happy Path)

This section describes key user flows (Primary Flows) that the system should support. Flows are formulated at functional level and used as basis for UX design, API contracts, and task decomposition.

---

### 6.1 Primary Flow: Ingest Source → Chunk → Enrich → Save

**Goal:** Prepare knowledge for RAG from a source document.

**Flow:**

1. User selects "Add Source" action
2. System offers source type options (Confluence, URL, Manual)
3. User provides source content or link
4. System extracts and displays content as data source
5. User initiates chunking
6. System splits source into chunks using LLM
7. System displays chunks with boundaries and editing capability
8. User edits chunks as needed:
   - Text editing
   - Merging chunks
   - Splitting chunks
9. User uses LLM assistant for enrichment (optional)
10. User selects target collection
11. System shows preview of final chunks
12. User confirms saving
13. System publishes chunks to collection

---

### 6.2 Primary Flow: Improve Existing Knowledge

**Goal:** Update or enhance existing chunks in a collection.

**Flow:**

1. User logs into system
2. Selects relevant collection by purpose
3. Reviews existing knowledge
4. Selects specific chunk or chunk group
5. Makes edits to text or context
6. Uses LLM assistant if needed
7. Reviews changes in preview
8. Confirms saving

---

### 6.3 General Rules for Primary Flows

- No chunk changes should be applied without explicit user confirmation
- LLM results are always presented as suggestions, not automatically applied changes
- Collection selection is mandatory step before saving
- All editing happens in a draft session; publishing is atomic

---

## 7. MVP Scope

This section specifies the minimum set of functionality (MVP) required to launch the product and deliver practical value to the team. Everything not included in MVP is considered consciously deferred.

---

### 7.1 MVP In Scope

#### Data Sources

- Manual source addition
- Document source import:
  - Document upload by user
  - Single document import via Confluence link
- Import sources via URL
- Store source as separate entity
- Manual re-processing of source

---

#### Splitting into Chunks

- Automatic source splitting into chunks using LLM
- Visual display of split result
- Ability to edit chunks:
  - Text editing
  - Split / merge

---

#### Knowledge Enrichment

- Manual context addition to chunks
- LLM assistant with fixed set of scenarios:
  - Text simplification
  - Terminology clarification
  - Adding clarifying examples
  - Text rewriting for target audience
- Explicit confirmation of change application

---

#### Collections

- Collection creation and editing
- Mandatory purpose and target audience specification
- Chunk assignment to collection before saving

---

#### Collection Editor

- View all chunks within a collection with pagination
- Direct edit, create, delete chunks (no draft session)
- Split and merge chunk operations
- Manual chunk reordering (drag-and-drop)
- AI collection analysis and quality report
- AI suggestions for chunk operations
- Quality scoring per chunk (0-100)

---

#### User Scenarios

- Primary Flows described in section 6 must be fully implemented

---

### 7.2 Out of Scope (Not Included in MVP)

The following capabilities are **consciously excluded** from MVP:

- Real-time synchronization with Confluence
- Bulk scanning of documents or Confluence spaces
- Automatic chunk quality assessment
- Retrieval metrics and analytics
- A/B testing RAG answers
- Automatic knowledge updates on source changes
- Chunk version management

---

### 7.3 MVP Completion Criteria

MVP is considered complete if:

- All Primary Flows execute end-to-end
- Users can independently complete their knowledge management scenarios
- Knowledge can be uploaded, edited, enriched, and saved

---

## 8. Example User Journey

### 8.1 Improving RAG Answer Quality

1. User notices that RAG poorly answers a question related to product functionality
2. Logs into knowledge management system
3. Selects relevant collection by purpose
4. Finds related chunks using search or browsing
5. Uses LLM assistant to clarify formulations
6. Reviews changes in preview
7. Confirms chunk saving
8. Updated knowledge is now available for RAG

---

## 9. Assumptions and Limitations

- Initially, there is no formal chunk quality metric
- User confirmation is considered sufficient for chunk saving
- Product is oriented towards iterative development
- All users have equal access to all features (no role-based restrictions)

---

## 10. Success Criteria

- Team members can independently improve RAG context
- Knowledge enrichment process is transparent and controllable
- Time from identifying RAG issue to deploying fix is minimized

---

## 11. Open Questions

- Process for working with outdated knowledge
- Expansion of LLM assistant scenarios
- Search and discovery within collections

---

# Appendix A — Business Process Flow (BPMN)

## A.1 Import Source → Chunking → Enrichment → Save (MVP)

**Scope:** MVP

**Actors:** User, System, LLM

**Purpose:** Preparation of knowledge for RAG from a source document

### BPMN Diagram

```
@startuml
title BPMN — Source Ingestion & Chunk Preparation (MVP)

|User|
start
:Provide source (Confluence link / URL / manual);

|System|
:Fetch/receive content;
:Create Data Source;

|LLM|
:Split source into chunks;

|System|
:Present chunked content to user;

|User|
:Edit chunk text;
:Split / merge chunks (optional);
:Use LLM assistant for enrichment (optional);
:Select target collection;

|System|
:Generate preview of final chunks;

|User|
if (Confirm save?) then (Yes)
  |System|
  :Publish chunks to collection;
  stop
else (No)
  :Return to editing;
endif

@enduml
```

### What is Fundamentally Important Here

- **LLM is not the owner of changes**

  All changes are *proposal-based*; the final decision always rests with the user.

- **Chunking is an intermediate step, not a final result**

- **Collection is selected before saving, not retroactively**

- **All features available to all users** — no artificial restrictions
