---
sidebar_position: 1
title: Installation
---

# Installation Guide

This guide will walk you through setting up RAGler on your local machine. RAGler is a knowledge management system for RAG (Retrieval-Augmented Generation) with Human-in-the-Loop validation.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **pnpm** ([Install instructions](https://pnpm.io/installation))
- **Docker** with Docker Compose ([Get Docker](https://docs.docker.com/get-docker/))
- **Git** ([Download](https://git-scm.com/downloads))

### Verify Prerequisites

```bash
# Check Node.js version (should be 20+)
node --version

# Check pnpm
pnpm --version

# Check Docker
docker --version
docker compose version
```

## Clone the Repository

```bash
git clone https://github.com/ragler-oss/ragler.git
cd ragler
```

## Backend Setup

The backend is a NestJS API server that handles data ingestion, chunking, and publishing.

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` and set your OpenAI API key:

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Required environment variables:**

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for chunking and enrichment | **Required** |
| `PORT` | Server port | `3000` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `QDRANT_URL` | Qdrant connection URL | `http://localhost:6333` |

### 4. Start Infrastructure Services

RAGler requires Redis (for draft sessions) and Qdrant (for vector storage):

```bash
# Start Redis and Qdrant using Docker Compose
docker compose up -d redis qdrant
```

**Verify services are running:**

```bash
# Check running containers
docker compose ps

# Expected output:
# NAME                COMMAND             STATUS        PORTS
# backend-redis-1     ...                 Up            0.0.0.0:6379->6379/tcp
# backend-qdrant-1    ...                 Up            0.0.0.0:6333->6333/tcp
```

### 5. Start the Backend Server

```bash
# Development mode with hot reload
pnpm start:dev
```

The backend API will be available at:
- **API:** `http://localhost:3000/api`
- **Swagger Docs:** `http://localhost:3000/api/docs`

### 6. Verify Backend Installation

Open your browser and navigate to `http://localhost:3000/api/docs` to see the Swagger API documentation.

Or test with curl:

```bash
# Health check
curl http://localhost:3000/health/live

# Expected response: {"status":"ok"}
```

## Frontend Setup (Optional)

The frontend is a Next.js application with a Metronic UI for managing knowledge collections.

### 1. Navigate to Frontend Directory

```bash
# From the ragler root directory
cd frontend
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

```bash
# Copy the example environment file (if exists)
cp .env.example .env
```

Set the backend API URL:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 4. Start the Frontend

```bash
# Development mode
pnpm dev
```

The frontend will be available at `http://localhost:3001` (or the port specified by Next.js).

## MCP Server Setup (Optional)

The MCP (Model Context Protocol) server provides AI agents with structured access to RAGler's knowledge base.

### 1. Navigate to MCP Server Directory

```bash
# From the ragler root directory
cd mcp-server
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Set the backend API URL:

```bash
KMS_API_URL=http://localhost:3000
```

### 4. Build and Start

```bash
# Build the MCP server
pnpm build

# Start the server
pnpm start
```

## Docker Compose (Full Stack)

Alternatively, you can run the entire stack using Docker Compose from the root directory:

```bash
# From the ragler root directory
docker compose up -d
```

This will start:
- Redis
- Qdrant
- Backend API
- Frontend (if configured)

## Verification Checklist

After installation, verify that all components are working:

- [ ] **Redis** is running: `docker compose ps | grep redis`
- [ ] **Qdrant** is running: `docker compose ps | grep qdrant`
- [ ] **Backend API** responds: `curl http://localhost:3000/health/live`
- [ ] **Swagger docs** accessible: Open `http://localhost:3000/api/docs`
- [ ] **Frontend** (optional): Open `http://localhost:3001`

## Common Issues

If you encounter issues during installation, see the [Troubleshooting Guide](./troubleshooting.md).

## Next Steps

Now that RAGler is installed:

1. [Configure your environment](./configuration.md) — Set up Confluence integration, adjust settings
2. [Create your first collection](./first-collection.md) — Walk through ingesting and publishing knowledge
3. [Explore the Product Guide](/docs/product/intro) — Learn about sessions, collections, and workflows

## Development Commands

For developers contributing to RAGler:

```bash
# Run tests
cd backend
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:cov

# Run E2E tests (requires infrastructure)
pnpm test:e2e

# Lint and format code
pnpm lint
pnpm format

# Build for production
pnpm build
```

See [Development Guide](/docs/development/setup) for more details.

## Architecture Overview

RAGler consists of:

- **Backend API** (NestJS) — REST API for data ingestion, chunking, and publishing
- **Frontend** (Next.js + Metronic) — Web UI for managing collections
- **Redis** — Ephemeral storage for draft sessions
- **Qdrant** — Vector database for published chunks
- **MCP Server** (optional) — AI agent integration via Model Context Protocol

For more details, see the [Architecture Overview](/docs/architecture/overview).
