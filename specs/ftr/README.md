# Feature Technical Requirements (FTR)

This directory contains Feature Technical Requirements documents that bridge business requirements (BRD) and technical implementation (SAD/ADRs).

## Purpose

FTRs provide:
- Detailed functional requirements for specific features
- Non-functional requirements (NFR) foundation
- Technical considerations for architecture decisions
- Acceptance criteria for development and QA
- Traceability back to BRD sections

## Naming Convention

```
FTR-XXX-feature-name.md
```

Where `XXX` is a sequential number (001, 002, 003...).

## Creating FTRs

Use the BA skill:
```
/ba-ftr ftr <feature-name>
```

Or create manually following the template in `.claude/skills/ba-ftr/SKILL.md`.

## Document Lifecycle

1. **Draft** — Initial creation, gathering requirements
2. **Under Review** — Stakeholder review in progress
3. **Approved** — Ready for implementation
4. **Implemented** — Feature is complete
5. **Deprecated** — Feature removed or superseded

## Index

| ID | Feature | Status | BRD Section | Description |
|----|---------|--------|-------------|-------------|
| [FTR-001](./FTR-001-data-ingestion.md) | Data Ingestion | Draft | 4, 5.1 | Source types, fetching, storage |
| [FTR-002](./FTR-002-chunking.md) | Chunking | Draft | 5.2 | LLM splitting, split/merge operations |
| [FTR-003](./FTR-003-enrichment.md) | Enrichment | Draft | 5.3 | LLM assistant scenarios |
| [FTR-004](./FTR-004-collections.md) | Collections | Draft | 3 | CRUD, purpose/audience metadata |
| [FTR-005](./FTR-005-sessions.md) | Draft Sessions | Draft | 6.1-6.3 | Session lifecycle in Redis |
| [FTR-006](./FTR-006-publishing.md) | Publishing | Draft | 5.4 | Atomic replacement to Qdrant |

## Next FTR Number

When creating a new FTR, use **FTR-007**.
