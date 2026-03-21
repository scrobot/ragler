# Turborepo Monorepo Migration Design

**Date:** 2026-03-21
**Status:** Approved
**Scope:** Migrate ragler to Turborepo monorepo with shared types package and full Docker Compose coverage (production + development)

---

## 1. Goals

- Convert the current two-app repo (backend + frontend) into a canonical Turborepo monorepo
- Extract shared Zod schemas and TypeScript types into a `@ragler/shared` package consumed by both apps
- Add a `docker-compose.dev.yml` for local development with hot-reload
- Update `docker-compose.yml` (production) for monorepo context
- Maintain all existing functionality, tests, and CI/CD compatibility

---

## 2. Repository Structure

```
ragler/
├── apps/
│   ├── backend/                  # NestJS API (moved from ./backend/)
│   └── frontend/                 # Next.js app (moved from ./frontend/)
├── packages/
│   └── shared/                   # @ragler/shared
│       ├── src/
│       │   ├── schemas/
│       │   │   ├── collection.schema.ts
│       │   │   ├── chunk.schema.ts
│       │   │   ├── session.schema.ts
│       │   │   ├── ingest.schema.ts
│       │   │   └── index.ts
│       │   ├── types/
│       │   │   ├── collection.types.ts
│       │   │   ├── api.types.ts
│       │   │   └── index.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── turbo.json
├── pnpm-workspace.yaml
├── package.json                  # workspace root
├── .changeset/                   # moved from apps/backend/
├── .husky/                       # git hooks at root
├── docker-compose.yml            # production (updated)
└── docker-compose.dev.yml        # development (new)
```

---

## 3. Turborepo Pipeline

**`turbo.json`:**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "persistent": true,
      "cache": false
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "cache": false
    }
  }
}
```

**Key rules:**
- `^build` means "build all dependencies first" — `@ragler/shared` always compiles before apps
- `dev` is `persistent` (long-running process) and uncached
- `test` is uncached (always runs fresh)

---

## 4. pnpm Workspace

**`pnpm-workspace.yaml`** (root):
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Root `package.json`:**
```json
{
  "name": "ragler",
  "private": true,
  "scripts": {
    "build":     "turbo build",
    "dev":       "turbo dev",
    "lint":      "turbo lint",
    "typecheck": "turbo typecheck",
    "test":      "turbo test",
    "changeset": "changeset",
    "prepare":   "husky"
  },
  "devDependencies": {
    "turbo": "latest",
    "husky": "^9.0.0",
    "@changesets/cli": "^2.29.8"
  }
}
```

A single `pnpm-lock.yaml` lives at the root. Each app retains its own `package.json`.

---

## 5. `@ragler/shared` Package

### Philosophy
Use **TypeScript source exports** — no compilation step for the shared package itself. Both apps resolve it directly via `tsconfig paths`. This avoids a separate `tsc` watch process during development.

### `packages/shared/package.json`
```json
{
  "name": "@ragler/shared",
  "version": "0.1.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "zod": "*"
  }
}
```

### Contents

**`schemas/collection.schema.ts`** — Zod schemas for collection CRUD (migrated from backend DTOs)
**`schemas/chunk.schema.ts`** — Chunk shape, metadata
**`schemas/session.schema.ts`** — Session and preview state
**`schemas/ingest.schema.ts`** — URL ingest, file ingest request shapes

**`types/collection.types.ts`** — `z.infer<>` exports for all collection schemas
**`types/api.types.ts`** — Generic `ApiResponse<T>`, `PaginatedResponse<T>`, error envelope

### Consuming in backend (`apps/backend`)
```typescript
import { CreateCollectionSchema, type CreateCollectionDto } from '@ragler/shared';
```

### Consuming in frontend (`apps/frontend`)
```typescript
import { CreateCollectionSchema } from '@ragler/shared';
// Use directly in react-hook-form + zodResolver
```

### tsconfig path alias (each app)
```json
{
  "paths": {
    "@ragler/shared": ["../../packages/shared/src/index.ts"]
  }
}
```

---

## 6. Docker Compose

### Production (`docker-compose.yml`)

Build context changes from `./backend` → `.` (monorepo root) to allow Dockerfiles to access `packages/shared`.

```yaml
services:
  api:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    # ... rest unchanged

  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
      args:
        BACKEND_INTERNAL_URL: http://api:3000
    # ... rest unchanged
```

Dockerfiles are updated to copy from monorepo root:
```dockerfile
# In apps/backend/Dockerfile (builder stage)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY apps/backend/package.json ./apps/backend/package.json
RUN pnpm install --frozen-lockfile
COPY apps/backend ./apps/backend
RUN pnpm --filter @ragler/backend build
```

### Development (`docker-compose.dev.yml`)

Lightweight containers — source mounted as volumes, no compilation in Docker.

```yaml
services:
  api:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile.dev
    volumes:
      - ./apps/backend:/app/apps/backend
      - ./packages/shared:/app/packages/shared
      - /app/apps/backend/node_modules
    ports:
      - "3010:3000"
    environment:
      - NODE_ENV=development
      - REDIS_HOST=redis
      - QDRANT_URL=http://qdrant:6333
    command: pnpm --filter @ragler/backend start:dev
    depends_on:
      - redis
      - qdrant

  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile.dev
    volumes:
      - ./apps/frontend:/app/apps/frontend
      - ./packages/shared:/app/packages/shared
      - /app/apps/frontend/node_modules
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:3010/api
    command: pnpm --filter @ragler/frontend dev
    depends_on:
      - api

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - redis_data:/data

volumes:
  qdrant_data:
  redis_data:
```

**`apps/backend/Dockerfile.dev`** — installs deps, no build:
```dockerfile
FROM node:20-alpine
RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/backend/package.json ./apps/backend/package.json
RUN pnpm install --frozen-lockfile
```

**`apps/frontend/Dockerfile.dev`** — installs deps, no build:
```dockerfile
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
RUN pnpm install --frozen-lockfile
```

---

## 7. Husky & Git Hooks

Move `.husky/` to root. Update `prepare` script in root `package.json` to `"husky"`. Remove `prepare` from `apps/backend/package.json`.

---

## 8. Changesets

Move `.changeset/` from `apps/backend/` to repo root. `@changesets/cli` is promoted to root `devDependencies`. The `pnpm changeset` command runs from root.

---

## 9. Migration Steps (high-level)

1. Move `backend/` → `apps/backend/`, `frontend/` → `apps/frontend/`
2. Create root `package.json`, `pnpm-workspace.yaml`, `turbo.json`
3. Run `pnpm install` from root → single lock file
4. Create `packages/shared/` with extracted schemas
5. Update `tsconfig.json` in both apps to add `@ragler/shared` path alias
6. Replace inline schemas in backend/frontend with imports from `@ragler/shared`
7. Update Dockerfiles for monorepo context
8. Update `docker-compose.yml` build contexts
9. Create `docker-compose.dev.yml` + dev Dockerfiles
10. Move `.changeset/` and `.husky/` to root
11. Verify all tests pass: `pnpm test`
12. Verify Docker builds: `docker compose build`

---

## 10. Out of Scope

- Adding new schemas not already present in the backend
- Changing API contracts
- CI/CD pipeline changes (GitHub Actions — separate task)
- Adding new features to either app
