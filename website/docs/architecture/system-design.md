---
sidebar_position: 2
title: System Design
---

# System Design

## Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Backend** | Node.js (NestJS) | Strict modularity, DI, Typescript. |
| **Frontend** | React 18 + Metronic | Enterprise UI ready-made components. |
| **Draft Store** | Redis | Fast ephemeral storage for sessions. |
| **Vector DB** | Qdrant | Self-hosted, performant, payload filtering. |

## Deployment Topology

Run via `docker-compose`:

```yaml
version: '3.8'
services:
  api:
    build: ./backend
    depends_on: [redis, qdrant]
  frontend:
    build: ./frontend
  qdrant:
    image: qdrant/qdrant:latest
  redis:
    image: redis:alpine
```
