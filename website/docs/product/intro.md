---
sidebar_position: 1
title: Introduction
---

# Introduction to RAGler

## Document Purpose

This document describes business and functional requirements for a knowledge management product for RAG (Retrieval-Augmented Generation). It reflects the evolution of the product considering research, user roles, and the need for a user-friendly interface.

## Product Goals

- Ensure managed population and development of RAG context
- Make working with RAG data accessible not only to ML specialists, but also to developers and L2 support
- Reduce team dependency on ML experts when tuning knowledge
- Ensure a transparent and reproducible process for improving LLM answer quality

## Scope

**Within scope:**
- Data upload and preparation for RAG
- Management of chunks and collections
- Knowledge enrichment with LLM and user participation
- Different modes of operation depending on user role
- User scenarios for improving RAG responses

**Out of scope:**
- Architecture and infrastructure details (see Architecture docs)
- ML algorithms and retrieval strategies
- Non-functional requirements
- Answer quality monitoring in production

## Key Concepts

- **Data Source** — initial material from which knowledge is formed
- **Chunk** — atomic unit of knowledge used in RAG
- **Collection** — logical grouping of chunks describing the context of their use
- **Enrichment** — adding clarifying or structuring context to a chunk
- **Mode of Operation** — variant of user interface and available actions depending on role
