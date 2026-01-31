---
name: llm-chunking-and-refine
description: Controls LLM usage for chunking and enrichment
---

LLM rules:
- LLM produces proposals only
- No auto-apply
- Chunking output must be structured
- Enrichment scenarios are fixed:
  - simplify
  - clarify terminology
  - add examples
  - rewrite for audience

User confirmation is mandatory.