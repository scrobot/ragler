# Development Setup

## What this page is for

Set up backend, frontend, MCP server, and docs for day-to-day development.

## Prerequisites

- Node.js 20+
- pnpm
- Docker

## Steps

1. Start infrastructure.

```bash
docker compose up -d redis qdrant
```

2. Backend.

```bash
cd backend
pnpm install
cp .env.example .env
pnpm start:dev
```

3. Frontend.

```bash
cd ../frontend
pnpm install
pnpm dev
```

4. MCP server.

```bash
cd ../mcp-server
pnpm install
pnpm dev
```

5. Docs site.

```bash
cd ../docs
pnpm install
pnpm start
```

## Verify

- Backend Swagger: `http://localhost:3000/api/docs`
- Frontend loads and calls backend.
- Docs site loads at Docusaurus default port.

## Next steps

- `/docs/development/releasing`
