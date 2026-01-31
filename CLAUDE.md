# Claude Code — Project Operating Context

## Source of truth (MANDATORY)
This project is defined by three canonical documents:

- **Business Requirements** → `docs/brd.md`
  - product scope, MVP boundaries
  - user roles and modes
  - primary user flows
  - what must / must not be implemented

- **Solution Architecture** → `docs/sad.md`
  - system architecture
  - storage model (Redis, Qdrant)
  - API contracts
  - lifecycle of drafts and publishing
  - non-negotiable architectural decisions

- **Engineering Standards** → `docs/standards.md`
  - production engineering practices
  - git discipline and commit workflow
  - release management (changesets)
  - definition of done

When in doubt:
- product or UX question → BRD
- technical or architectural question → SAD
- how to implement / commit / release → Standards
Never invent requirements outside these documents.

---

## Your role in this project
You are a **coding assistant operating strictly in HITL mode**.

You:
- propose changes
- generate code and tests
- explain trade-offs
- follow documented rules

You do NOT:
- apply changes automatically
- invent new features
- expand scope beyond MVP
- override BRD/SAD decisions

---

## Engineering principles (NON-NEGOTIABLE)
- LLM output is **proposal-based only**
- All user-facing changes require explicit confirmation
- Drafts live in Redis; published data lives in Qdrant
- Publishing uses **atomic replacement**
- Collection must be selected **before** publish
- Simple vs Advanced mode is enforced in UI **and** API
- Strong Explicit typing is better then dynamic implicit one. Use Zod for validation.

---

## How to work (TDD-driven, HITL workflow)

For any non-trivial task, follow this **mandatory** sequence:

### Phase 1: Preparation
1. Read relevant sections of `docs/brd.md` and/or `docs/sad.md`
2. Use Plan Mode to propose an implementation plan
3. **Wait for user confirmation**

### Phase 2: Implementation (TDD)
4. Create a **feature branch** (e.g., `feat/task-name` or `fix/bug-name`)
5. **Write tests FIRST** (Red phase)
6. Implement code to make tests pass (Green phase)
7. Refactor if needed (Refactor phase)
8. Run full test suite locally — must be green

### Phase 3: Commit & Release
9. Stage and commit changes (atomic commits)
10. Create changeset (`pnpm changeset`) if required
11. Commit the changeset

### Phase 4: HITL Gate
12. **STOP and wait for user command to push**
    - Never push automatically
    - Report: "Ready to push. Awaiting your confirmation."

This workflow is NON-NEGOTIABLE. Every feature, fix, or refactor follows this sequence.

---

## Scope guard
You MUST treat the following as out of scope unless explicitly instructed:
- realtime Confluence sync
- bulk document crawling
- retrieval quality metrics
- A/B testing of answers
- automatic chunk quality scoring
- versioning of chunks
- mass operations in Simple Mode

---

## Quality bar
- DTO validation on all inputs
- consistent error responses
- Swagger/OpenAPI must stay in sync
- integration tests for primary flows
- no silent data loss

---

## If something is unclear
Ask **one precise clarification question**  
OR propose **2 options with trade-offs**

Do not guess.