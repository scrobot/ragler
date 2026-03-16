# RAGler — UI Test Plans

**Project:** RAGler (KMS-RAG)
**Version:** 1.1.0
**Author:** QA Engineer
**Date:** 2026-03-14
**Coverage:** UI-facing functionality (covers ~99.9% backend logic)

---

## Summary

| # | Test Plan | Module | Test Cases | Priority |
|---|-----------|--------|:----------:|----------|
| TP-01 | [Dashboard](./TP-01-dashboard.md) | Dashboard | 12 | Medium |
| TP-02 | [Ingestion](./TP-02-ingestion.md) | Ingestion | 31 | Critical |
| TP-03 | [Sessions & Content Editor](./TP-03-sessions.md) | Sessions | 24 | Critical |
| TP-04 | [Collections](./TP-04-collections.md) | Collections | 30 | Critical |
| TP-05 | [Chat & Agent](./TP-05-chat-agent.md) | Chat, Agent | 18 | High |
| TP-06 | [Settings](./TP-06-settings.md) | Settings | 19 | Medium |
| TP-07 | [E2E & Cross-Cutting](./TP-07-e2e-cross-cutting.md) | Cross-module | 20 | Critical |
| | **Total** | | **154** | |

---

## Coverage by Type

| Type | Count | Description |
|------|:-----:|-------------|
| Smoke | 8 | Page loads, basic structure |
| Functional | 72 | Core feature behavior |
| Negative | 35 | Error handling, invalid input |
| Edge Case | 22 | Boundary values, unusual states |
| E2E | 6 | Full lifecycle workflows |
| Security | 2 | XSS, API key masking |
| Performance | 2 | Load times, large datasets |
| UI/Visual | 4 | Responsive, toasts, drag-drop |

---

## Coverage by Feature Area

| Feature Area | Test Plans | Key TCs |
|-------------|------------|---------|
| Confluence (REMOVED) | TP-02, TP-06 | TC-02.05, TC-02.06, TC-06.13 |
| Web URL Ingestion | TP-02 | TC-02.13 → TC-02.17 |
| Manual Ingestion | TP-02 | TC-02.18 → TC-02.22 |
| File Upload | TP-02 | TC-02.23 → TC-02.32 |
| Chunking (LLM/Char) | TP-02 | TC-02.03, TC-02.04 |
| Session Lifecycle | TP-03 | TC-03.01 → TC-03.23 |
| Chunk Editing | TP-03, TP-04 | TC-03.08, TC-04.14 |
| Chunk Split/Merge | TP-03, TP-04 | TC-03.10-12, TC-04.15-16 |
| Preview & Publish | TP-03 | TC-03.14 → TC-03.18 |
| Collection CRUD | TP-04 | TC-04.01 → TC-04.07 |
| Collection Overview | TP-04 | TC-04.08, TC-04.09 |
| Document Lineage | TP-04 | TC-04.10, TC-04.11 |
| Chunk Filters | TP-04 | TC-04.13 |
| RAG Chat | TP-04, TP-05 | TC-04.19-23, TC-05.01-04 |
| AI Agent (SSE) | TP-05 | TC-05.05 → TC-05.07 |
| Agent Sessions | TP-05 | TC-05.08 → TC-05.10 |
| Collection Cleaning | TP-05 | TC-05.11, TC-05.12 |
| System Prompts | TP-06 | TC-06.01 → TC-06.06 |
| Agent Model Config | TP-06 | TC-06.07 → TC-06.11 |
| Feature Flags | TP-06 | TC-06.12 → TC-06.19 |
| Health Checks | TP-07 | TC-07.18 → TC-07.20 |
| Resilience | TP-07 | TC-07.07 → TC-07.09 |
| Security | TP-07 | TC-07.14, TC-07.15 |

---

## Prioritization Guide

**Run first (Smoke):** TC-01.01, TC-02.01, TC-03.01, TC-04.01, TC-05.01, TC-06.07, TC-06.12, TC-07.18

**Critical path (E2E):** TC-07.01 → TC-07.06

**Regression suite (top 20):**
TC-02.13, TC-02.18, TC-02.23, TC-02.35, TC-02.36, TC-03.08, TC-03.10, TC-03.11, TC-03.14, TC-03.16, TC-04.02, TC-04.05, TC-04.14, TC-04.20, TC-05.05, TC-06.14, TC-06.16, TC-07.01, TC-07.04, TC-07.14

---

## How to use with AgentiQA

These test plans are designed to be imported into [AgentiQA](https://www.agentiqa.com/). Each test case follows a consistent format with: ID, Title, Priority, Severity, Type, Preconditions, Steps, Expected Result — making them compatible with most test management systems.
