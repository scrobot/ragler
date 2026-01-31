# KMS-RAG Backend

> Knowledge Management System API for RAG — Human-in-the-Loop data curation

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment template and configure
cp .env.example .env
# Edit .env with your OpenAI API key

# 3. Start infrastructure (Redis + Qdrant)
docker compose up -d redis qdrant

# 4. Run in development mode
pnpm start:dev
```

API available at `http://localhost:3000/api`
Swagger docs at `http://localhost:3000/api/docs`

## Features

- **Data Ingestion** — Import from Confluence, web URLs, or manual input
- **Draft Sessions** — Edit chunks in Redis before publishing
- **LLM-Assisted Processing** — Automatic chunking and enrichment scenarios
- **Role-Based Access** — ML Specialist, Developer, and L2 Support roles
- **Simple/Advanced Modes** — UI mode restrictions enforced at API level
- **Atomic Publishing** — Delete-Insert strategy prevents duplicate chunks

## Installation

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for Redis and Qdrant)

### Setup

```bash
# Clone and enter the backend directory
cd backend

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `QDRANT_URL` | Qdrant connection URL | `http://localhost:6333` |
| `OPENAI_API_KEY` | OpenAI API key | — |
| `THROTTLE_TTL` | Rate limit window (ms) | `60000` |
| `THROTTLE_LIMIT` | Max requests per window | `100` |

## Usage

### Running the Server

```bash
# Development (with hot reload)
pnpm start:dev

# Production build
pnpm build
pnpm start:prod
```

### API Reference

All endpoints are prefixed with `/api`. Full OpenAPI documentation available at `/api/docs`.

#### Collections

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `GET` | `/collections` | List all collections | All |
| `GET` | `/collections/:id` | Get collection by ID | All |
| `POST` | `/collections` | Create collection | DEV, ML |
| `DELETE` | `/collections/:id` | Delete collection | DEV, ML |

#### Ingest

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ingest` | Start ingestion session |

Request body:
```json
{
  "source_type": "confluence | web | manual",
  "url": "https://...",
  "content": "..."
}
```

#### Session

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `GET` | `/session/:id` | Get session details | All |
| `POST` | `/session/:id/chunks/merge` | Merge chunks | All |
| `POST` | `/session/:id/chunks/:chunkId/split` | Split chunk | DEV, ML |
| `PATCH` | `/session/:id/chunks/:chunkId` | Update chunk text | All |
| `POST` | `/session/:id/preview` | Lock session for preview | All |
| `POST` | `/session/:id/publish` | Publish to collection | All |

#### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Full health check |
| `GET` | `/health/liveness` | Liveness probe |
| `GET` | `/health/readiness` | Readiness probe |

### Authentication Headers

| Header | Description | Required |
|--------|-------------|----------|
| `X-User-ID` | User identifier | Yes |
| `X-User-Role` | User role (`ML`, `DEV`, `L2`) | No |

## Development

### Project Structure

```
src/
├── common/           # Shared utilities
│   ├── decorators/   # @User, @Roles decorators
│   ├── dto/          # Error response DTOs
│   ├── filters/      # Exception filters
│   ├── guards/       # Role guard
│   └── pipes/        # Zod validation pipe
├── config/           # Configuration module
├── infrastructure/   # External services
│   ├── redis/        # Redis client
│   └── qdrant/       # Qdrant client
└── modules/
    ├── collection/   # Collection management
    ├── health/       # Health indicators
    ├── ingest/       # Data ingestion strategies
    ├── llm/          # OpenAI integration
    ├── session/      # Draft session management
    └── vector/       # Vector operations
```

### Testing

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:cov

# E2E tests
pnpm test:e2e
```

### Code Quality

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Formatting
pnpm format
```

### Building

```bash
pnpm build
# Output: dist/
```

## Architecture

The backend follows a modular NestJS architecture:

- **Draft Store (Redis):** Temporary storage for editing sessions
- **Knowledge Store (Qdrant):** Vector database for published chunks and collection registry
- **LLM Gateway:** OpenAI integration for chunking and enrichment

Key architectural decisions:

1. **Atomic Replacement:** Publishing uses delete-then-insert to prevent duplicate chunks
2. **Session Isolation:** All edits happen in Redis drafts before committing to Qdrant
3. **Role Enforcement:** API-level guards enforce Simple/Advanced mode restrictions

See `docs/sad.md` for detailed Solution Architecture Document.

## License

MIT
