# Business Requirements Document (BRD v2)

## 1. General Information

### 1.1 Document Purpose

This document describes business and functional requirements for a knowledge management product for RAG (Retrieval-Augmented Generation). The document reflects the evolution of the initial BRD version considering product research, user roles, and the need for a user-friendly interface for different team categories.

The document describes **what the system should do**, without describing architecture, technology stack, or non-functional requirements.

---

### 1.2 Product Goals

- Ensure managed population and development of RAG context
- Make working with RAG data accessible not only to ML specialists, but also to developers and L2 support
- Reduce team dependency on ML experts when tuning knowledge
- Ensure a transparent and reproducible process for improving LLM answer quality

---

### 1.3 Scope

Within the product:

- Data upload and preparation for RAG
- Management of chunks and collections
- Knowledge enrichment with LLM and user participation
- Different modes of operation depending on user role
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
- **Mode of Operation** — variant of user interface and available actions depending on role

---

## 3. Role and Mode Model

### 3.1 User Roles

#### 3.1.1 ML Specialist

Characteristics:

- Deep understanding of RAG principles
- Responsible for experiments, retrieval quality, and overall knowledge strategy

Key tasks:

- Control of chunk structure
- Analysis and correction of enrichment
- Work with collections at the level of meanings and experiments

---

#### 3.1.2 Developer (Backend / Platform / Product Engineer)

Characteristics:

- Understands what RAG and chunks are
- Does not want to dive into ML details

Key tasks:

- Improve RAG answers for specific scenarios
- Clarify formulations, examples, terminology
- Make corrections quickly without involving ML specialist

---

#### 3.1.3 L2 Support

Characteristics:

- Not required to understand RAG mechanics
- Works with user questions and incidents

Key tasks:

- Improve knowledge affecting answers to clients
- Simplify or clarify texts
- Fix inaccuracies without risk of damaging technical context

---

### 3.2 Modes of Operation

#### 3.2.1 Advanced Mode

Available to:

- ML specialists
- Developers

Features:

- Full access to chunks
- Work with original and enriched text
- Extended LLM assistant scenarios

---

#### 3.2.2 Simple Mode

Available to:

- L2 support
- Users without ML expertise

Features:

- Work through scenarios and prompts
- No need to understand chunk structure
- Focus on meaning and formulations

---

## 4. Collections Concept (Updated)

### 4.1 Purpose of a Collection

A collection represents a **context of knowledge use**, not just a set of chunks.

Each collection should describe:

- Which audience the knowledge is intended for
- In which scenarios it is used
- What style and level of detail is expected

---

### 4.2 Collection Management

The system should allow:

- Creating collections with description of purpose
- Editing collection description and parameters
- Managing chunk composition within a collection
- Preventing implicit loss of chunks when deleting a collection

---

## 5. Data Source Types

### 5.1 General Concept of Sources

A data source is a primary entity representing logically complete material from which chunks of knowledge are formed.

The system should:

- Support multiple types of data sources
- Maintain relationship between source and generated chunks
- Allow re-processing of source at user's initiative

---

### 5.2 Data Source Types

#### 5.2.1 Document Sources

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

#### 5.2.2 URL / Web Pages

Description: Sources represented by content accessible via URL.

Functional requirements:

- User should be able to specify a URL
- System should extract text content of the page
- Content is saved as a data source

---

#### 5.2.3 Manual Input

Description: A source created by user directly in the system.

Functional requirements:

- User should be able to create a source manually
- Entered content is saved as a data source

---

## 6. Functional Requirements

### 6.1 Data Upload and Preparation

- System should allow uploading data from various sources
- System should split data into chunks
- Chunks should be saved in intermediate state before enrichment

---

### 6.2 Splitting Sources into Chunks

- System should allow user to supplement chunk with additional context
- System should provide LLM assistant with predefined enrichment scenarios
- User must explicitly confirm application of enrichment results

---

### 6.3 LLM Assistant (Scenario-based)

LLM assistant should support scenarios:

- Text simplification for selected audience
- Terminology clarification
- Adding clarifying examples
- Identifying ambiguous formulations

---

### 6.4 Preview and Saving

- System should provide preview of final version of chunk
- User should be able to return to editing
- Confirmed chunks are saved as ready for use

---

### 6.5 Splitting Sources into Chunks (Detailed)

- System should use LLM to split source into chunks
- Split result should be presented to user in visual form
- User should see chunk boundaries and their content
- User should be able to edit split result before enrichment

Chunk editing should include:

- Merging chunks
- Splitting chunks
- Text correction within chunk

---

### 6.6 Chunk Enrichment and LLM Assistant

- System should allow user to manually add context to chunk
- System should provide LLM assistant with predefined enrichment scenarios
- LLM assistant results should be applied to chunk only after explicit user confirmation

---

### 6.7 Chunk Preview and Saving

- User should be able to select collection for chunks
- System should provide preview of final version of chunks
- Chunk saving should require user confirmation

---

## 7. Capabilities Matrix (Roles × Actions)

This section specifies which actions are available to users depending on their role and mode of operation. The matrix is used as a contract between product, architecture, and development.

### 7.1 Roles

- **ML Specialist** — RAG and retrieval expert
- **Developer** — Engineer working with product and API, understanding RAG at conceptual level
- **L2 Support** — User working with client cases and content without knowledge of RAG internal implementation

---

### 7.2 Actions and Availability

| Action | ML Specialist | Developer | L2 Support |
|--------|---------------|-----------|------------|
| Create source (upload document / URL / manual input) | Yes | Yes | Yes |
| Import document via Confluence link | Yes | Yes | Yes |
| View entire original source | Yes | Yes | Yes |
| Run source re-processing | Yes | Yes | No |
| View chunk splitting result | Yes | Yes | Yes |
| Edit chunk boundaries (split / merge) | Yes | Yes | No |
| Edit chunk text | Yes | Yes | Yes |
| Add context to chunk manually | Yes | Yes | Yes |
| Use LLM assistant (scenarios) | Yes | Yes | Yes |
| Select and change collection for chunk | Yes | Yes | Yes |
| Create and edit collections | Yes | Yes | No |
| Change collection purpose and description | Yes | Yes | No |
| Save chunks as ready for use | Yes | Yes | Yes |
| Bulk operations with chunks | Yes | No | No |

---

### 7.3 Simple Mode Limitations

For users in Simple Mode (L2 Support):

- System should not require understanding of chunk structure
- Split / merge operations are unavailable
- Interaction with chunks is through scenarios and simplified editing forms
- User works only with final text and enriched context

---

### 7.4 Advanced Mode Limitations

For users in Advanced Mode (ML Specialist, Developer):

- Full chunk structure is available
- Structure change operations are available
- Extended LLM assistant scenarios are available

---

## 8. Primary User Flows (Happy Path)

This section describes key user flows (Primary Flows) that the system should support. Flows are formulated at functional level and used as basis for UX design, API contracts, and task decomposition.

---

### 8.1 Primary Flow: Confluence → Chunking → Save (Simple Mode)

**Target Role:** L2 Support  
**Mode:** Simple Mode  
**Goal:** Quickly improve knowledge affecting client answers without understanding internal RAG structure.

**Flow:**

1. User selects "Add Source" action
2. System offers source type options
3. User selects "Confluence Document"
4. User pastes Confluence document link
5. System extracts document content and displays it as source
6. User runs source processing
7. System splits document into chunks using LLM
8. System displays split result in simplified form:
   - Sequential text
   - Visual chunk boundaries without technical metadata
9. User edits chunk text (without split / merge operations)
10. User uses LLM assistant scenarios to simplify or clarify formulations
11. User selects target collection
12. System shows preview of final knowledge version
13. User confirms chunk saving
14. System saves chunks as ready for use

---

### 8.2 Primary Flow: Confluence → Chunking → Save (Advanced Mode)

**Target Role:** Developer  
**Mode:** Advanced Mode  
**Goal:** Precisely correct structure and content of knowledge for specific product scenario.

**Flow:**

1. User selects "Add Source" action
2. Selects "Confluence Document" source type
3. Pastes document link
4. System extracts and displays document as source
5. User runs chunking
6. System displays chunks with explicit boundaries and structural editing capability
7. User performs operations:
   - Merging chunks
   - Splitting chunks
   - Text editing
8. User uses LLM assistant for chunk enrichment
9. User selects or changes collection for chunks
10. User reviews final result
11. Confirms saving
12. System saves chunks

---

### 8.3 Primary Flow: Improving Existing Knowledge

**Target Role:** Developer / L2 Support  
**Mode:** Simple or Advanced (depending on role)

**Flow:**

1. User logs into system
2. Selects relevant collection by purpose
3. Reviews existing knowledge
4. Selects specific chunk or chunk group
5. Makes edits to text or context
6. Uses LLM assistant if needed
7. Reviews changes
8. Confirms saving

---

### 8.4 Primary Flow: ML Specialist — Control and Correction

**Target Role:** ML Specialist  
**Mode:** Advanced Mode

**Flow:**

1. ML Specialist logs into system
2. Selects collection or source
3. Analyzes chunk structure
4. Corrects splitting and enrichment
5. Confirms changes
6. Uses updated knowledge for further experiments

---

### 8.5 General Rules for Primary Flows

- No chunk changes should be applied without explicit user confirmation
- LLM results are always presented as suggestions, not automatically applied changes
- Collection selection is mandatory step before saving
- User mode determines available set of actions

---

## 9. MVP Scope

This section specifies the minimum set of functionality (MVP) required to launch the product and deliver practical value to the team. Everything not included in MVP is considered consciously deferred.

---

### 9.1 MVP In Scope

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
  - Text editing (all roles)
  - Split / merge (Advanced Mode only)

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

#### Roles and Modes

- Support for roles: ML Specialist, Developer, L2 Support
- Support for modes: Simple Mode and Advanced Mode
- Functionality restrictions according to Capabilities Matrix

---

#### User Scenarios

- Primary Flows described in section 8 must be fully implemented

---

### 9.2 Out of Scope (Not Included in MVP)

The following capabilities are **consciously excluded** from MVP:

- Real-time synchronization with Confluence
- Bulk scanning of documents or Confluence spaces
- Automatic chunk quality assessment
- Retrieval metrics and analytics
- A/B testing RAG answers
- Automatic knowledge updates on source changes
- Chunk version management
- Bulk operations for Simple Mode users

---

### 9.3 MVP Completion Criteria

MVP is considered complete if:

- All Primary Flows execute end-to-end
- Users of all roles can independently complete their scenarios
- Knowledge can be uploaded, edited, enriched, and saved without ML specialist involvement

---

## 10. Assumptions and Limitations

### 10.1 User Journey: Developer

1. Developer notices that RAG poorly answers a question related to product functionality
2. Logs into system in Advanced Mode
3. Selects relevant collection by purpose
4. Finds related chunks
5. Uses LLM assistant to clarify formulations
6. Reviews changes
7. Confirms chunk saving

---

### 10.2 User Journey: L2 Support

1. L2 Support receives user question or incident
2. Logs into system in Simple Mode
3. Selects scenario or collection related to client answers
4. Views knowledge in human-readable form
5. Uses LLM assistant scenario to simplify or clarify text
6. Confirms changes without working with technical details

---

### 10.3 User Journey: ML Specialist

1. ML Specialist analyzes RAG answer quality
2. Logs into system in Advanced Mode
3. Works directly with collections and chunks
4. Corrects structure and knowledge enrichment
5. Confirms changes and uses them for further experiments

---

### 10.4 General Assumptions and Limitations

- Initially, there is no formal chunk quality metric
- User confirmation is considered sufficient for chunk saving
- Product is oriented towards iterative development

---

## 11. Success Criteria

- Developers and L2 Support can independently improve RAG context
- ML Specialists are not a bottleneck in the process
- Knowledge enrichment process is transparent and controllable

---

## 12. Open Questions

- Detailed access rights specifications between roles
- Process for working with outdated knowledge
- Expansion of LLM assistant scenarios

# Appendix A — Business Process Flow (BPMN)

## A.1 Import Confluence Document → Chunking → Enrichment → Save (MVP)

**Scope:** MVP

**Actors:** User (L2 / Developer / ML), System, LLM

**Purpose:** Preparation of knowledge for RAG from a single Confluence document

### BPMN Diagram

```
@startuml
title BPMN — Confluence Document Ingestion & Chunk Preparation (MVP)

|User|
start
:Provide Confluence document link;

|System|
:Fetch document content;
:Create Data Source;

|LLM|
:Split document into chunks;

|System|
:Present chunked content to user;

|User|
if (Mode?) then (Simple Mode)
  :Edit chunk text;
  :Use LLM assistant (guided scenarios);
else (Advanced Mode)
  :Edit chunk text;
  :Split / merge chunks;
  :Use LLM assistant (extended scenarios);
endif

:Select target collection;

|System|
:Generate preview of final chunks;

|User|
if (Confirm save?) then (Yes)
  |System|
  :Persist chunks;
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

- **Simple / Advanced is process branching, not different processes**