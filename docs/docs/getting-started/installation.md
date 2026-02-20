---
sidebar_position: 1
title: Installation
---

# Installation

## What this page is for

Set up local infrastructure and run the backend API.

## Prerequisites

- Node.js 20+
- pnpm
- Docker
- Git

## Steps

1. Clone repository and move to backend.

```bash
git clone https://github.com/ragler-oss/ragler.git
cd ragler/backend
```

2. Install and configure environment.

```bash
pnpm install
cp .env.example .env
```

3. Set required variables in `.env`.

```env
OPENAI_API_KEY=...
REDIS_HOST=localhost
REDIS_PORT=6379
QDRANT_URL=http://localhost:6333
```

4. Start dependencies from repo root.

```bash
cd ..
docker compose up -d redis qdrant
cd backend
```

5. Start backend.

```bash
pnpm start:dev
```

## Verify

```bash
curl http://localhost:3000/api/health/liveness
curl http://localhost:3000/api/health/readiness
```

Open Swagger: `http://localhost:3000/api/docs`.

## Troubleshooting

- `Environment validation failed`: check required `.env` keys.
- Readiness fails: check Docker containers and ports `6379`, `6333`.

## Next steps

- `/docs/getting-started/configuration`
- `/docs/getting-started/first-collection`
