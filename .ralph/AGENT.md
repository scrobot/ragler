# Ralph Agent Configuration — RAGler

## Prerequisites

- Node.js 20+
- pnpm
- Docker & Docker Compose

## Infrastructure

```bash
# Start Redis + Qdrant (required for backend)
docker compose up -d redis qdrant
```

## Backend (NestJS)

```bash
cd backend
pnpm install
cp .env.example .env  # Set OPENAI_API_KEY in .env
pnpm start:dev        # Dev server with hot reload on port 3000
```

### Backend Tests

```bash
cd backend
pnpm test             # Unit tests
pnpm test:cov         # Coverage
pnpm test:e2e         # E2E (requires running infra)
```

### Backend Lint & Format

```bash
cd backend
pnpm lint             # ESLint
pnpm typecheck        # TypeScript check
pnpm format           # Prettier
```

### Backend Build

```bash
cd backend
pnpm build            # Compile to dist/
```

## Frontend (Next.js)

```bash
cd frontend
pnpm install
cp .env.example .env.local  # Set NEXT_PUBLIC_API_URL if needed
pnpm dev                     # Dev server on port 3001
```

### Frontend Build

```bash
cd frontend
pnpm build
```

## Documentation Site (Docusaurus)

```bash
cd docs
pnpm install
pnpm start            # Dev server with hot reload
pnpm build            # Production build
pnpm serve            # Serve production build locally
```

## MCP Server

```bash
cd mcp-server
pnpm install
pnpm build
pnpm start
```

## Verify Everything Works

```bash
# 1. Health checks
curl http://localhost:3000/api/health/liveness
curl http://localhost:3000/api/health/readiness

# 2. Swagger docs
open http://localhost:3000/api/docs

# 3. Frontend
open http://localhost:3001

# 4. Docs site
open http://localhost:3000  # Docusaurus default port
```

## Notes

- Backend requires `OPENAI_API_KEY` in `.env` for LLM features
- Infrastructure (Redis + Qdrant) must be running before starting backend
- Frontend connects to backend at `http://localhost:3000` by default
- Docs site is standalone Docusaurus, no backend dependency
