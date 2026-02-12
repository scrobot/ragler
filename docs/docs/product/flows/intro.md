---
sidebar_position: 1
title: Primary Flows
---

# Primary User Flows

This section describes the key user workflows (Happy Paths) that KMS-RAG supports.

## Overview

All users have access to all features. The system supports two primary workflows:

### 1. Ingest New Knowledge

Add new content to the RAG knowledge base:

1. User provides source (Confluence link, URL, or manual input)
2. System fetches content and splits into chunks using LLM
3. User reviews and edits chunks (text editing, split/merge)
4. User enriches with LLM assistant (optional)
5. User selects target collection
6. User previews and publishes

**See:** [Complete Workflow Guide](./workflow.md)

### 2. Improve Existing Knowledge

Update or enhance already-published content:

1. User identifies content that needs improvement
2. User re-ingests from same source (creates new draft session)
3. User edits chunks as needed
4. User publishes (atomic replacement removes old, adds new)

**See:** [Complete Workflow Guide](./workflow.md)

## Key Principles

- **HITL (Human-in-the-Loop):** All changes require explicit user confirmation
- **LLM as Assistant:** LLM suggestions are proposals, never auto-applied
- **Atomic Publishing:** Publishing replaces all chunks from a source atomically
- **Collection-First:** Collection must be selected before publishing
