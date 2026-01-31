# Solution Architecture Document: KMS for RAG

**Project Name:** Knowledge Management System (KMS-RAG)  
**Version:** 2.0 (Final Approved)  
**Date:** 2026-01-31  
**Status:** Ready for Development  
**Author:** Senior Solution Architect

---

## 1. Executive Summary

KMS-RAG is a knowledge management system that provides **Human-in-the-Loop** data validation before data enters the search index. The system allows L2-Support and Developers to curate the knowledge base without involvement of ML engineers.

**Architectural paradigm (v2.0):**

- **Vector-First & Only:** Rejection of SQL. Data (content) and metadata (collection registry) are stored in Qdrant.
- **Dynamic Context:** Collections are not rigidly fixed but managed via API, transforming the system from a "configured utility" to a full-fledged product.
- **Atomic Consistency:** Document (source) updates follow a full replacement strategy (Delete-Insert), guaranteeing no duplicates when chunk structure changes.

## 2. Goals & Scope

### 2.1 Primary Goals

1. **Democratization:** Provide tools for editing RAG context to non-ML specialists.
2. **Dynamic Organization:** Allow users to create isolated knowledge collections (Knowledge Buckets) for specific business tasks.
3. **Trust & Audit:** Ensure transparency — who, when, and which source changed.

### 2.2 MVP Scope Constraints

- **No IAM System:** Authentication is deferred (uses Trusted Header `X-User-ID`).
- **No Real-time Sync:** Confluence synchronization is on-demand (on-demand ingestion).

---

## 3. High-Level Architecture (C4 Container)

```
graph TD
    User["User (L2/Dev)"] --> WebApp["SPA Client"]
    WebApp --> API["KMS Backend API"]

    subgraph "Logic Layer"
        API --> Ingest["Ingestion Strategy"]
        API --> LLM_GW["LLM Gateway"]
        API --> Coll_Mgr["Collection Manager"]
    end

    subgraph "State Layer"
        API --> Redis["Redis: Draft Sessions"]
        Coll_Mgr --> Qdrant["Qdrant: Vector DB"]
    end

    subgraph "External"
        Ingest --> Conf["Confluence"]
        LLM_GW --> OpenAI["OpenAI API"]
    end
```

### Key Components

1. **Draft Store (Redis):** "Sandbox". This is where chunks live during editing, split/merge operations. Preview happens here too.
2. **Knowledge Store (Qdrant):**
   - `data_{collection_uuid}`: Storage of vectors and content.
   - `sys_registry`: System collection storing the list of user-created collections.
3. **Ingestion Engine:** Loading module. Computes source hash to control changes.

---

## 4. Core Architecture Decisions (ADR)

### 4.1 Dynamic Collections (No-SQL Registry)

Instead of hardcoding domains, we use Qdrant itself to store collection metadata.

- **Solution:** Create technical collection `sys_registry`.
- **Point Schema in `sys_registry`:**
  - `id`: Collection UUID.
  - `payload`: `{ "name": "Business Logic", "description": "...", "created_by": "user_1" }`.
- **Benefit:** No need to launch PostgreSQL for one table. Infrastructure remains flat.

### 4.2 Chunk Lifecycle: Atomic Replacement

- **Problem:** When editing, user may merge chunks 1 and 2. If deterministic IDs (url+index) are used, old chunks remain as "garbage" in the database.
- **Solution:**
  1. Chunks receive **Random UUID** on generation.
  2. All chunks of one document are connected via `source_id` field (hash of URL).
  3. **Publish Transaction:**
     - Step 1: `Qdrant.delete(filter: { source_id: "..." })`
     - Step 2: `Qdrant.upsert(new_chunks)`
- **Result:** Guaranteed database cleanliness. No ID collisions on split/merge.

---

## 5. Functional Architecture

### 5.1 Role-Based Mode (Security)

- **Identification:** API expects headers `X-User-Role` (L2/DEV) and `X-User-ID` (email/login).
- **Access Control:**
  - `Simple Mode (L2)`: UI hides Split/Merge buttons. API blocks calls to `/chunks/{id}/split`.
  - `Collection Mgmt`: Only role `DEV` or `ML` can call `POST /collections`.

### 5.2 The "Two LLMs" Pattern

1. **Architect (GPT-4o):** Used for initial chunking. Strict JSON output.
2. **Assistant (GPT-4o-mini):** Used for Enrichment (scenarios like "Simplify", "Clarify"). Cheap and fast.

### 5.3 Frontend (SPA Client)

- **Stack:** React + TypeScript.
- **UI Framework:** Metronic 8 (React Version) — used for rapid construction of professional Admin UI (ready layouts, table components, forms, and wizards).
- **State Management:** React Query (TanStack Query) — for synchronizing session state with backend.

---

## 6. Data Architecture

### 6.1 Qdrant Vector Schema (Data Collections)

Collections are created dynamically with name `kb_{uuid}`.

**Payload Schema:**

```json
{
  "id": "UUID v4 (Random)",
  "vector": [...],
  "payload": {
    "content": "Text content...",
    "source_id": "MD5(url)",
    "source_url": "https://confluence...",
    "source_type": "confluence",
    "context_breadcrumbs": "Page > Section",
    "last_modified_by": "ivan.dev@company.com",
    "last_modified_at": "ISO-8601",
    "revision": 1
  }
}
```

### 6.2 Redis Session Schema

```
key: "session:{session_id}"
{
  "source_url": "...",
  "user_id": "...",
  "status": "DRAFT",
  "chunks": [
    { "id": "temp_1", "text": "...", "is_dirty": true },
    { "id": "temp_2", "text": "..." }
  ]
}
```

---

## 7. Process Flows

### 7.1 Ingestion & Edit (Draft Phase)

1. **Start:** `POST /ingest` → Creates session in Redis.
2. **Chunking:** LLM slices text → JSON placed in Redis.
3. **Edit Loop:** User edits text, merges chunks. All changes go **only** to Redis.

### 7.2 Preview & Publish (Commit Phase)

```
sequenceDiagram
    actor User
    participant API
    participant Redis
    participant Qdrant

    Note over User, API: User is happy with drafts

    User->>API: POST /session/{session_id}/preview
    API->>Redis: Lock Session (Read-Only)
    API-->>User: Return Final Structure Validation

    User->>API: POST /session/{session_id}/publish
    Note right of User: Payload: { target_collection_id: "uuid-..." }

    API->>API: Check Headers (X-User-ID) for Audit
    API->>Redis: Get Draft Chunks

    group Atomic Replacement
        API->>Qdrant: DELETE from {collection_id} WHERE source_id == session.source_id
        API->>Qdrant: UPSERT new chunks (with modified_by field)
    end

    API->>Redis: Delete Session
    API-->>User: 200 OK (Published)
```

---

## 8. Integration Interfaces (API)

### 8.1 Collection Management

- `GET /collections` — List available knowledge bases (Registry).
- `POST /collections` — Create new collection. *Restricted to DEV/ML.*
  - *Body:* `{ "name": "Support FAQ", "description": "L2 answers" }`
- `DELETE /collections/{id}` — Delete collection.

### 8.2 Session & Content Operations

- `POST /ingest` — Start editing session.
  - *Returns:* `session_id`.
- `POST /session/{id}/chunks/merge` — Merge array of chunks into one.
  - *Body:* `{ "chunk_ids": ["id1", "id2"] }`
- `POST /session/{id}/chunks/{chunk_id}/split` — **Split chunk** (Advanced Mode).
  - *Body:* `{ "split_points": [index1, index2] }` OR `{ "new_text_blocks": ["text1", "text2"] }`
- `POST /session/{id}/refine` — Run LLM assistant for chunk.
- `POST /session/{id}/preview` — Lock session and validate before publishing.
- `POST /session/{id}/publish` — Final commit.
  - *Body:* `{ "target_collection_id": "uuid" }`
  - *Note:* `target_domain` excluded to avoid conflicts. Domain metadata taken from collection properties.

---

## 9. Infrastructure & Technology Stack

This section describes the selected technology stack and deployment scheme that ensures performance and enables local execution (Self-Hosted).

### 9.1 Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Backend Runtime** | **Node.js (LTS)** | High performance for I/O-bound tasks (proxying requests to LLM and Confluence). Single language (TS) with frontend. |
| **Backend Framework** | **NestJS** | Strict modular architecture, built-in DI (Dependency Injection), validation via DTO (class-validator), and Swagger generation. |
| **Frontend Core** | **React 18+ / TypeScript** | Industry standard for SPA. |
| **Frontend UI** | **Metronic 8 (React)** | Ready design system for Enterprise interfaces. Accelerates development (ready widgets, sidebars, forms). |
| **Session Store** | **Redis (Container)** | Fast key-value store for temporary drafts. |
| **Vector DB** | **Qdrant (Container)** | Performant vector engine with payload filtering support. Runs locally (Self-hosted). |

### 9.2 Application Components

#### A. KMS Backend API (NestJS)

Service built on modular principles:

- `IngestModule`: Responsible for loading strategies (Confluence/Web).
- `SessionModule`: Manages lifecycle of drafts in Redis.
- `LlmModule`: Wrapper over OpenAI API (uses `openai` npm package).
- `VectorModule`: Client to Qdrant (uses `@qdrant/js-client-rest`).
- **Queueing (Optional for MVP):** For long chunking operations, use **BullMQ** (based on Redis) to avoid blocking Event Loop.

#### B. Frontend Application (React / Metronic)

- SPA, served via Nginx.
- Uses Metronic Layouts for workspace separation (Simple Mode vs Advanced Mode).
- Authorization: passing mock headers or integrating with Basic Auth at Nginx level.

### 9.3 Deployment Topology (Docker Compose)

For MVP and local development, use single `docker-compose.yml`.

```yaml
version: '3.8'

services:
  # 1. Backend Service
  api:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - REDIS_HOST=redis
      - QDRANT_URL=http://qdrant:6333
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - redis
      - qdrant

  # 2. Frontend Service
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - api

  # 3. Vector Database (Self-Hosted)
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - ./qdrant_data:/qdrant/storage

  # 4. Session Store (Self-Hosted)
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    command: redis-server --save 60 1 --loglevel warning
```

### 9.4 Development Requirements

- **Node.js:** v20+
- **Package Manager:** pnpm
- **Docker Engine:** For running infrastructure dependencies.

---

## 10. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Dangling Chunks** | Network failure during Publish: old deleted, new not written. | Implement retry-policy on backend. Qdrant operations are atomic in batches. |
| **Audit Spoofing** | Attacker forges X-User-ID header. | System for internal use only. Configure trust-list IP addresses at Ingress level. |
| **Vector "Drift"** | User changes text so it no longer matches collection topic. | (Future) Add LLM validator at Preview stage: "Is this text really about Architecture?". |