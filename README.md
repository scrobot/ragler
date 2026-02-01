# KMS-RAG

Knowledge Management System for Retrieval-Augmented Generation (RAG) with Human-in-the-Loop validation.

## Overview

KMS-RAG is a backend API for managing knowledge bases used in RAG applications. It provides:

- **Data Ingestion** - Import content from web URLs, Confluence pages, or manual input
- **Chunk Management** - Break down content into atomic knowledge units
- **Collection Organization** - Group chunks into logical collections
- **Human-in-the-Loop** - Draft sessions with preview and validation before publishing
- **LLM Integration** - OpenAI-powered chunking and enrichment

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for Redis and Qdrant)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ragler/backend

# Install dependencies
pnpm install

# Copy environment configuration
cp .env.example .env

# Start infrastructure (Redis + Qdrant)
docker compose up -d redis qdrant

# Start development server
pnpm start:dev
```

The API will be available at `http://localhost:3000`.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `REDIS_HOST` | Yes | `localhost` | Redis host |
| `REDIS_PORT` | Yes | `6379` | Redis port |
| `QDRANT_URL` | Yes | `http://localhost:6333` | Qdrant vector database URL |
| `OPENAI_API_KEY` | Yes | - | OpenAI API key for LLM operations |
| `THROTTLE_TTL` | No | `60000` | Rate limit window (ms) |
| `THROTTLE_LIMIT` | No | `100` | Max requests per window |

### Confluence Integration (Optional)

| Variable | Required | Description |
|----------|----------|-------------|
| `CONFLUENCE_BASE_URL` | For Confluence | Atlassian base URL (e.g., `https://your-domain.atlassian.net`) |
| `CONFLUENCE_USER_EMAIL` | For Confluence | Email for Basic Auth |
| `CONFLUENCE_API_TOKEN` | For Confluence | [API token](https://id.atlassian.com/manage-profile/security/api-tokens) |
| `CONFLUENCE_FETCH_TIMEOUT` | No | Fetch timeout in ms (default: 30000) |

## Available Commands

```bash
# Development
pnpm start:dev        # Start with hot reload
pnpm start:debug      # Start with debugger

# Testing
pnpm test             # Run unit tests
pnpm test:watch       # Watch mode
pnpm test:cov         # Coverage report
pnpm test:e2e         # E2E tests (requires infrastructure)

# Code Quality
pnpm lint             # ESLint with auto-fix
pnpm typecheck        # TypeScript type checking
pnpm format           # Prettier formatting

# Build
pnpm build            # Compile to dist/
pnpm start:prod       # Run production build
```

## API Endpoints

### Health Checks

| Endpoint | Description |
|----------|-------------|
| `GET /health/live` | Liveness probe |
| `GET /health/ready` | Readiness probe (checks Redis, Qdrant) |

### Ingestion

| Endpoint | Description |
|----------|-------------|
| `POST /api/ingest` | Ingest content from various sources |

**Supported Source Types:**

- `web` - Fetch and extract content from a URL
- `confluence` - Import from Confluence pages (via URL or page ID)
- `manual` - Direct text input

**Example: Web Ingestion**
```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user@example.com" \
  -d '{"sourceType": "web", "url": "https://example.com/docs"}'
```

**Example: Confluence Ingestion (by URL)**
```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user@example.com" \
  -d '{
    "sourceType": "confluence",
    "url": "https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456/Title"
  }'
```

**Example: Confluence Ingestion (by Page ID)**
```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user@example.com" \
  -d '{"sourceType": "confluence", "pageId": "123456"}'
```

**Example: Manual Input**
```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user@example.com" \
  -d '{"sourceType": "manual", "content": "Your knowledge content here..."}'
```

### Sessions

| Endpoint | Description |
|----------|-------------|
| `GET /api/sessions/:id` | Get session details |
| `PATCH /api/sessions/:id` | Update session |
| `DELETE /api/sessions/:id` | Delete session |

### Collections

| Endpoint | Description |
|----------|-------------|
| `GET /api/collections` | List all collections |
| `POST /api/collections` | Create a collection |
| `GET /api/collections/:id` | Get collection details |
| `DELETE /api/collections/:id` | Delete a collection |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                            │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Ingest  │  │ Session │  │Collection│  │    Health    │  │
│  └────┬────┘  └────┬────┘  └────┬─────┘  └──────────────┘  │
└───────┼────────────┼───────────┼───────────────────────────┘
        │            │           │
        ▼            ▼           ▼
┌───────────────┐  ┌───────────────────────────────────────┐
│  Strategies   │  │              Services                  │
│ ┌───────────┐ │  │  ┌─────────┐  ┌─────────┐  ┌───────┐  │
│ │    Web    │ │  │  │  Redis  │  │  Qdrant │  │  LLM  │  │
│ ├───────────┤ │  │  └────┬────┘  └────┬────┘  └───┬───┘  │
│ │Confluence │ │  │       │            │           │      │
│ ├───────────┤ │  │       ▼            ▼           ▼      │
│ │  Manual   │ │  │  ┌─────────┐  ┌─────────┐  ┌───────┐  │
│ └───────────┘ │  │  │ Sessions│  │ Vectors │  │OpenAI │  │
└───────────────┘  │  │ (Draft) │  │(Published│  │       │  │
                   │  └─────────┘  └─────────┘  └───────┘  │
                   └───────────────────────────────────────┘
```

### Storage Model

- **Redis** - Draft sessions (temporary editing sandbox with TTL)
- **Qdrant** - Published chunks and collection registry

### Key Modules

| Module | Purpose |
|--------|---------|
| `ingest` | Data ingestion via strategy pattern (Web, Confluence, Manual) |
| `session` | Draft lifecycle management in Redis |
| `collection` | CRUD for knowledge collections |
| `llm` | OpenAI integration for chunking and enrichment |
| `vector` | Qdrant vector database operations |
| `health` | Health check endpoints |

## Documentation

- [Business Requirements (BRD)](docs/brd.md) - Product scope, user flows, MVP boundaries
- [Solution Architecture (SAD)](docs/sad.md) - Technical architecture, API contracts, storage model

## Development

### Testing

Tests are located in `backend/test/`:

```
test/
├── unit/           # Unit tests (mirror src/ structure)
│   └── module/
│       └── service.spec.ts
├── e2e/            # End-to-end tests
│   └── ingest.e2e-spec.ts
└── jest-e2e.json
```

Run a single test file:
```bash
pnpm test -- test/unit/ingest/ingest.service.spec.ts
```

### Path Aliases

```typescript
import { ... } from '@common/...';       // src/common/
import { ... } from '@config/...';       // src/config/
import { ... } from '@modules/...';      // src/modules/
import { ... } from '@infrastructure/...'; // src/infrastructure/
import { ... } from '@ingest/...';       // src/modules/ingest/
import { ... } from '@session/...';      // src/modules/session/
import { ... } from '@collection/...';   // src/modules/collection/
```

## License

ISC
