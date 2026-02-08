# Solution Architecture Document: KMS for RAG

**Project Name:** Knowledge Management System (KMS-RAG)
**Version:** 2.1
**Date:** 2026-02-06
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

---

## 11. MCP Server Integration

### 11.1 Purpose & Rationale

MCP (Model Context Protocol) server provides AI agents with structured access to KMS-RAG's knowledge base without direct vector database coupling.

**Key benefits:**

- **Abstraction**: AI agents query KMS-RAG, not Qdrant directly
- **Future-proof**: DB adapter pattern enables swapping Qdrant for other vector DBs
- **Enhanced search**: Hybrid search combining semantic + filtering/metadata
- **Standardization**: MCP is industry-standard protocol for AI tool integration

### 11.2 Architecture Position

```
graph TD
    Agent["AI Agent (Claude Code, etc.)"] --> MCP["MCP Server"]
    MCP --> API["KMS Backend API"]
    API --> Vector["VectorService"]
    Vector --> Qdrant["Qdrant"]

    Note: Future: API --> Adapter --> [Qdrant | Pinecone | Weaviate]
```

The MCP server acts as a protocol adapter between AI agents and KMS-RAG's search API.

### 11.3 MCP Server Requirements

#### 11.3.1 Core Operations (Tools)

The MCP server MUST expose the following tools:

**1. `search_knowledge`**

- **Description**: Search across knowledge collections with semantic + hybrid filtering
- **Parameters**:
  - `query` (required): Natural language search query
  - `collection_id` (optional): UUID of target collection (searches all if omitted)
  - `limit` (optional): Max results (1-100, default 10)
  - `filters` (optional): Metadata filters (source_type, date range, etc.)
- **Returns**: Array of search results with content, source URL, score, metadata

**2. `list_collections`**

- **Description**: List all available knowledge collections
- **Parameters**: None
- **Returns**: Array of collections with id, name, description, created_by

**3. `get_collection_info`**

- **Description**: Get detailed information about a specific collection
- **Parameters**:
  - `collection_id` (required): UUID
- **Returns**: Collection metadata + statistics (chunk count, last updated, etc.)

#### 11.3.2 Search Strategy: Hybrid Approach

The MCP server's search implementation MUST support:

1. **Semantic search** (default): Vector similarity via embeddings
2. **Metadata filtering**: By source_type, date range, collection
3. **Hybrid ranking** (future): Combine semantic similarity with:
   - Recency score (newer content ranked higher)
   - Source reputation (Confluence vs web)
   - User feedback signals

**Search algorithm evolution path**:

```
MVP: Pure semantic (VectorService)
  ↓
Phase 2: Add metadata filters
  ↓
Phase 3: Hybrid scoring with adjustable weights
  ↓
Phase 4: User feedback integration
```

#### 11.3.3 MCP Server Implementation

**Technology**: Node.js/TypeScript (aligned with backend stack)

**Integration pattern**:

```
mcp-server/
├── src/
│   ├── server.ts           # MCP protocol handler
│   ├── tools/
│   │   ├── search.ts       # search_knowledge implementation
│   │   ├── collections.ts  # collection tools
│   ├── client/
│   │   └── kms-api.ts     # HTTP client to KMS Backend API
│   └── config/
│       └── settings.ts     # MCP server config (API URL, auth)
└── package.json
```

**Communication**: MCP server calls KMS Backend API via HTTP (not direct Qdrant access)

#### 11.3.4 Configuration

MCP server configuration (`.mcp.json` or environment):

```json
{
  "name": "kms-rag",
  "version": "1.0.0",
  "server": {
    "command": "node",
    "args": ["dist/server.js"],
    "env": {
      "KMS_API_URL": "http://localhost:3000",
      "KMS_API_KEY": "${KMS_API_KEY}"
    }
  }
}
```

### 11.4 Vector Database Abstraction (Future)

The architecture anticipates replacing Qdrant with other vector databases.

**DB Adapter Pattern** (planned for post-MVP):

```typescript
interface IVectorAdapter {
  search(query: Vector, options: SearchOptions): Promise<SearchResult[]>
  upsert(points: VectorPoint[]): Promise<void>
  deleteByFilter(filter: Filter): Promise<void>
  createCollection(name: string, config: CollectionConfig): Promise<void>
}

// Implementations:
class QdrantAdapter implements IVectorAdapter { ... }
class PineconeAdapter implements IVectorAdapter { ... }
class WeaviateAdapter implements IVectorAdapter { ... }
```

**Benefits**:

- MCP server interface remains stable
- Swap vector DB without changing AI agent integrations
- Support multi-DB deployments (different collections in different DBs)

### 11.5 Security & Access Control

**Authentication**: MCP server authenticates to KMS Backend API using:

- API key (passed via environment variable)
- OR: Service account token (future IAM integration)

**Authorization**: Backend enforces role-based access:

- MCP server queries run with "service" role
- Access all published collections (no draft access)
- Respects collection-level permissions (future)

**Rate limiting**: Backend applies rate limits to prevent abuse

### 11.6 Observability

MCP server logging MUST include:

- Request correlation IDs (passthrough from AI agent)
- Search query text (sanitized, no PII)
- Collection IDs accessed
- Response times + result counts
- Error rates by operation

**Metrics** (Prometheus-style):

```
mcp_requests_total{tool,status}
mcp_request_duration_seconds{tool}
mcp_search_results_count{collection_id}
```

### 11.7 Development & Testing

**Local development**:

```bash
# Terminal 1: Start backend
cd backend && pnpm start:dev

# Terminal 2: Start MCP server
cd mcp-server && pnpm start:dev

# Terminal 3: Test MCP tools
mcp test search_knowledge --query "authentication"
```

**Integration tests**: Validate MCP tools against running backend API

### 11.8 Deployment Considerations

**MVP**: MCP server runs as separate process alongside backend

**Production options**:

1. **Sidecar**: Deploy MCP server container alongside backend pods
2. **Standalone**: Separate deployment with API gateway routing
3. **Embedded**: Integrate MCP protocol handler into backend (future)

**Scaling**: MCP server is stateless - scale horizontally as needed