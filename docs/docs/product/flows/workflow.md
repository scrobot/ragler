# Workflow Reference

## Flow 1: Ingest to Publish

```mermaid
flowchart LR
    A["Create\nCollection"] --> B["Ingest\nSource"]
    B --> C["Generate &\nEdit Chunks"]
    C --> D["Preview &\nPublish"]
    D --> E["Validate\nvia Search"]

    style A fill:#7c3aed,stroke:#a855f7,color:#fff
    style B fill:#7c3aed,stroke:#a855f7,color:#fff
    style C fill:#7c3aed,stroke:#a855f7,color:#fff
    style D fill:#7c3aed,stroke:#a855f7,color:#fff
    style E fill:#7c3aed,stroke:#a855f7,color:#fff
```

1. Create a collection via `POST /api/collections`.
2. Ingest source content via `POST /api/ingest/*`.
3. Generate chunks (`POST /api/session/:id/chunks`) and edit/split/merge as needed.
4. Preview (`POST /api/session/:id/preview`) then publish (`POST /api/session/:id/publish`).
5. Validate with `POST /api/search`.

## Flow 2: Maintain Existing Collection

```mermaid
flowchart LR
    A["List\nChunks"] --> B["Edit / Split\n/ Merge"]
    B --> C["Agent\nSuggestions"]
    C --> D["Validate\nSearch"]

    style A fill:#0891b2,stroke:#22d3ee,color:#fff
    style B fill:#0891b2,stroke:#22d3ee,color:#fff
    style C fill:#0891b2,stroke:#22d3ee,color:#fff
    style D fill:#0891b2,stroke:#22d3ee,color:#fff
```

1. List collection chunks via `GET /api/collections/:id/chunks`.
2. Edit, split, merge, or reorder directly in the collection editor.
3. (Optional) Use the [Collection Agent](/docs/product/collection-agent) for AI-assisted suggestions and cleaning.
4. Validate with search queries.

## Flow 3: Incident-style Validation

```mermaid
flowchart LR
    A["Identify\nBad Answer"] --> B["Locate\nChunk"]
    B --> C["Update\nContent"]
    C --> D["Confirm\nFix"]

    style A fill:#dc2626,stroke:#f87171,color:#fff
    style B fill:#dc2626,stroke:#f87171,color:#fff
    style C fill:#dc2626,stroke:#f87171,color:#fff
    style D fill:#dc2626,stroke:#f87171,color:#fff
```

1. Identify a missing or incorrect answer from the chat playground.
2. Locate the relevant collection and chunk via search or the collection editor.
3. Update chunk content via `PUT /api/collections/:id/chunks/:chunkId`.
4. Re-run the query to confirm the fix.
