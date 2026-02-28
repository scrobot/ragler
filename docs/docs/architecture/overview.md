# Architecture Overview

## What this page is for

Describe the runtime architecture and data flow used by RAGler.

## System diagram

```mermaid
graph TB
    subgraph Client["Client Layer"]
        FE["Next.js Frontend"]
        MCP["MCP Server<br/>(Claude Desktop)"]
    end

    subgraph API["Backend API (NestJS)"]
        ING["Ingest Module"]
        SES["Session Module"]
        COL["Collection Module"]
        LLM["LLM Module"]
        VEC["Vector Module"]
        HLT["Health Module"]
        SET["Settings Module"]
    end

    subgraph Storage["Storage Layer"]
        RED["Redis<br/>Draft Sessions"]
        QDR["Qdrant<br/>Published Vectors"]
    end

    OAI["OpenAI API"]

    FE --> API
    MCP --> API
    ING --> SES
    SES --> RED
    SES --> LLM
    COL --> VEC
    COL --> LLM
    LLM --> OAI
    VEC --> QDR
    HLT --> RED
    HLT --> QDR
    SET --> RED

    style Client fill:#1e1b4b,stroke:#7c3aed,color:#e0e7ff
    style API fill:#18181b,stroke:#a855f7,color:#fafafa
    style Storage fill:#1c1917,stroke:#f59e0b,color:#fef3c7
    style OAI fill:#0c4a6e,stroke:#38bdf8,color:#e0f2fe
```

## High-level components

| Component | Technology | Role |
|-----------|-----------|------|
| Frontend | Next.js 16, Tailwind CSS 4 | User interface for all operations |
| Backend API | NestJS | REST API with Swagger docs at `/api/docs` |
| Redis | Redis Alpine | Draft session storage with TTL |
| Qdrant | Qdrant | Published chunk vectors + metadata |
| OpenAI | OpenAI API | LLM chunking, embeddings, agent chat |
| MCP Server | TypeScript | Claude Desktop integration adapter |

## Data flow

```mermaid
sequenceDiagram
    participant U as User
    participant API as Backend API
    participant R as Redis
    participant LLM as OpenAI
    participant Q as Qdrant

    U->>API: POST /api/ingest/* (source content)
    API->>R: Create draft session
    API-->>U: sessionId

    U->>API: POST /api/session/:id/chunks
    API->>LLM: Chunk content + extract metadata
    LLM-->>API: Typed chunks with tags
    API->>R: Store chunks in session

    U->>API: Edit / split / merge chunks
    API->>R: Update session state

    U->>API: POST /api/session/:id/preview
    API->>R: Lock session, validate
    API-->>U: Preview result

    U->>API: POST /api/session/:id/publish
    API->>LLM: Generate embeddings
    API->>Q: Atomic upsert (delete old + write new)
    API->>R: Delete draft session
    API-->>U: Published chunk count

    U->>API: POST /api/search
    API->>Q: Vector similarity search
    Q-->>API: Scored results
    API-->>U: Search results with metadata
```

## Next steps

- [System Design](/docs/architecture/system-design)
- [Data Model](/docs/architecture/data-model)
- [Modules](/docs/architecture/modules/collection)
