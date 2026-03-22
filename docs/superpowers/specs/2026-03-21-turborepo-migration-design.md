# Turborepo Monorepo Migration Design

**Date:** 2026-03-21
**Status:** Approved
**Scope:** Migrate ragler to Turborepo monorepo with shared types package and full Docker Compose coverage (production + development)

---

## 1. Goals

- Convert the current two-app repo (backend + frontend) into a canonical Turborepo monorepo
- Extract shared Zod schemas and TypeScript types into a `@ragler/shared` package consumed by both apps
- Add a `docker-compose.dev.yml` for local development with hot-reload
- Update `docker-compose.yml` (production) for monorepo build context
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
│       ├── dist/                 # compiled output (gitignored)
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
- `^build` means "build all dependencies first" — `@ragler/shared` compiles to `dist/` before apps start
- `dev` task `dependsOn: ["^build"]` ensures shared is compiled before app watchers start
- `packages/shared` has its own `build` script (`tsc --build`) — not a no-op
- `test` is uncached; `build` is cached by Turbo per input hash

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

**Lockfile:** A single `pnpm-lock.yaml` at the repo root replaces the two per-app lockfiles. During migration the per-app lockfiles (`apps/backend/pnpm-lock.yaml`, `apps/frontend/pnpm-lock.yaml`) are deleted before running `pnpm install` from root.

**Rollback:** Tag the repo (`git tag pre-turborepo-migration`) before deleting per-app lockfiles. The migration is otherwise non-reversible without restoring from git history.

---

## 5. `@ragler/shared` Package

### Build strategy: compiled `dist/`

The shared package **compiles to `dist/`** via `tsc --build`. This is the only approach that works correctly for both:
- **NestJS backend**: runs compiled JS at runtime (`node dist/main`), so `node_modules/@ragler/shared` must expose valid JS
- **Next.js frontend**: webpack resolves from `exports` in `package.json`

Raw `.ts` source exports would fail at runtime in the backend. The "source exports" pattern requires every consumer to be a bundler that handles TypeScript — NestJS prod build is not.

### `packages/shared/package.json`
```json
{
  "name": "@ragler/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc --build",
    "typecheck": "tsc --noEmit"
  },
  "_note": "Intentionally no 'dev' (watch) script — shared is compiled once before dev containers start. Adding a watch script here would make turbo treat it as a persistent task and deadlock the dev pipeline.",
  "peerDependencies": {
    "zod": ">=3.22.0 <4.0.0"
  },
  "devDependencies": {
    "zod": "^3.23.0",
    "typescript": "^5.9.3"
  }
}
```

`zod` is a `peerDependency` with range `>=3.22.0 <4.0.0` (both apps currently use zod `^3.x`). It is also in `devDependencies` for the shared package's own `tsc` typecheck. This prevents duplicate zod instances at runtime.

### `packages/shared/tsconfig.json`
```json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "module": "CommonJS",
    "target": "ES2020"
  },
  "include": ["src"]
}
```

`composite: true` enables TypeScript project references so consuming apps can use `--build` mode for incremental cross-package type checking.

### TypeScript project references in consuming apps

**`apps/backend/tsconfig.json`** (add):
```json
{
  "references": [{ "path": "../../packages/shared" }]
}
```

**`apps/frontend/tsconfig.json`** (add):
```json
{
  "references": [{ "path": "../../packages/shared" }]
}
```

No `tsconfig paths` alias needed — pnpm workspace symlinks `packages/shared` into `node_modules/@ragler/shared`, and the `exports` field in `package.json` routes to the compiled `dist/`.

### Contents

**`schemas/collection.schema.ts`** — Zod schemas for collection CRUD (migrated from backend DTOs)
**`schemas/chunk.schema.ts`** — Chunk shape, metadata
**`schemas/session.schema.ts`** — Session and preview state
**`schemas/ingest.schema.ts`** — URL ingest, file ingest request shapes

**`types/collection.types.ts`** — `z.infer<>` exports for all collection schemas
**`types/api.types.ts`** — Generic `ApiResponse<T>`, `PaginatedResponse<T>`, error envelope

### Consuming
```typescript
import { CreateCollectionSchema, type CreateCollectionDto } from '@ragler/shared';
```

---

## 6. Husky & Git Hooks

1. Move `.husky/` from root (it is already at root per current project state) — verify hooks fire after migration
2. Remove `prepare` script from `apps/backend/package.json`
3. Root `package.json` `prepare: "husky"` runs on `pnpm install` at root for all contributors
4. Verify pre-commit hook: `git commit --allow-empty -m "test"` after migration

---

## 7. Changesets

Move `.changeset/` from `apps/backend/.changeset/` to repo root. Update `config.json`:

```json
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

All workspace packages (`@ragler/shared`, `@ragler/backend`, `@ragler/frontend`) are now versioned via changesets from root. Remove `@changesets/cli` from `apps/backend/devDependencies`.

---

## 8. Docker Compose

### Production (`docker-compose.yml`)

Build context changes from per-app directories to `.` (monorepo root), so Dockerfiles can access `packages/shared`.

```yaml
services:
  api:
    image: ghcr.io/scrobot/ragler/backend:latest
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    ports:
      - "3010:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - QDRANT_URL=http://qdrant:6333
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      redis:
        condition: service_started
      qdrant:
        condition: service_started
    networks:
      - ragler-network

  frontend:
    image: ghcr.io/scrobot/ragler/frontend:latest
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
      args:
        BACKEND_INTERNAL_URL: http://api:3000
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3010/api
      - BACKEND_INTERNAL_URL=http://api:3000
    depends_on:
      - api
    networks:
      - ragler-network

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage
    networks:
      - ragler-network

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - redis_data:/data
    networks:
      - ragler-network

  redisinsight:
    image: redis/redisinsight:latest
    ports:
      - "5540:5540"
    depends_on:
      - redis
    networks:
      - ragler-network
    profiles:
      - debug

networks:
  ragler-network:
    driver: bridge

volumes:
  qdrant_data:
  redis_data:
```

### Backend production Dockerfile (`apps/backend/Dockerfile`)

Multi-stage to handle `better-sqlite3` native addon (requires `python3 make g++`):

```dockerfile
# Stage 1: Build (needs build tools for native addons + tsc)
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests first (layer cache for pnpm install)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/backend/package.json ./apps/backend/package.json
# pnpm needs all workspace package.json files to resolve the graph
COPY apps/frontend/package.json ./apps/frontend/package.json

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Build shared first, then backend
RUN pnpm --filter @ragler/shared build
RUN pnpm --filter @ragler/backend build

# Stage 2: Production deps with native addon compiled for runtime
FROM node:20-alpine AS deps

WORKDIR /app

RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json

RUN pnpm install --prod --frozen-lockfile

# Recompile better-sqlite3 native addon
RUN cd /app/node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 \
    && npx --yes node-gyp rebuild

# Copy compiled shared package dist (needed at runtime)
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY packages/shared/package.json ./packages/shared/package.json

# Stage 3: Clean runtime image
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "apps/backend/dist/main"]
```

### Frontend production Dockerfile (`apps/frontend/Dockerfile`)

Next.js standalone output with monorepo context. Requires `OUTPUT_FILE_TRACING_ROOT` set in `next.config.ts`:

```typescript
// apps/frontend/next.config.ts
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'), // monorepo root
};
```

```dockerfile
# Stage 1: Install deps
FROM node:20-alpine AS deps

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/backend/package.json ./apps/backend/package.json

RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ARG BACKEND_INTERNAL_URL=http://localhost:3010
ENV BACKEND_INTERNAL_URL=${BACKEND_INTERNAL_URL}

RUN pnpm --filter @ragler/shared build
RUN pnpm --filter @ragler/frontend build

# Stage 3: Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/frontend/public ./public

RUN mkdir .next && chown nextjs:nodejs .next

# Standalone output — with outputFileTracingRoot set to monorepo root,
# the bundle is self-contained relative to /app
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Development (`docker-compose.dev.yml`)

Lightweight — source mounted as volumes, no compilation in Docker. Each container installs deps once; node_modules live in an **anonymous volume** that survives container restarts but is isolated from the host (prevents host/container platform mismatch).

When a developer adds a new dependency: run `docker compose -f docker-compose.dev.yml up --build` to reinstall.

**Cold start — shared `dist/` must exist before `docker compose up`:** On first run (or after cleaning), run `pnpm --filter @ragler/shared build` on the host before starting the dev containers. The apps import `@ragler/shared` from the bind-mounted `packages/shared/dist/`, which must be present at container start. This is documented in the developer onboarding README.

```yaml
services:
  api:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile.dev
    volumes:
      - ./apps/backend:/app/apps/backend
      - ./packages/shared:/app/packages/shared
      - backend_node_modules:/app/node_modules
    ports:
      - "3010:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - QDRANT_URL=http://qdrant:6333
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    command: pnpm --filter @ragler/backend start:dev
    depends_on:
      - redis
      - qdrant
    networks:
      - ragler-network

  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile.dev
    volumes:
      - ./apps/frontend:/app/apps/frontend
      - ./packages/shared:/app/packages/shared
      - frontend_node_modules:/app/node_modules
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:3010/api
      - BACKEND_INTERNAL_URL=http://api:3000
    command: pnpm --filter @ragler/frontend dev
    depends_on:
      - api
    networks:
      - ragler-network

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    networks:
      - ragler-network

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - redis_data:/data
    networks:
      - ragler-network

networks:
  ragler-network:
    driver: bridge

volumes:
  qdrant_data:
  redis_data:
  backend_node_modules:
  frontend_node_modules:
  # Note: packages/shared is bind-mounted but has no runtime node_modules
  # (zod is a peerDep satisfied by apps). No shared_node_modules volume needed.
```

**`apps/backend/Dockerfile.dev`:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests for dep install
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json

RUN pnpm install --frozen-lockfile

# Source is mounted at runtime via volumes
# CMD is provided by docker-compose.dev.yml
```

**`apps/frontend/Dockerfile.dev`:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/backend/package.json ./apps/backend/package.json

RUN pnpm install --frozen-lockfile

# Source is mounted at runtime via volumes
# CMD is provided by docker-compose.dev.yml
```

---

## 9. Migration Steps

Ordered, atomic steps. Each step must leave the repo in a valid state (all tests pass after step completion where applicable).

1. **Tag current state** — `git tag pre-turborepo-migration` for rollback reference
2. **Move apps** — `git mv backend apps/backend && git mv frontend apps/frontend`
3. **Delete per-app lockfiles** — remove `apps/backend/pnpm-lock.yaml` and `apps/frontend/pnpm-lock.yaml`
4. **Create root workspace files** — add root `package.json`, `pnpm-workspace.yaml`, `turbo.json`
5. **Install from root** — `pnpm install` at root → generates single `pnpm-lock.yaml`
6. **Verify existing tests pass** — `pnpm test` (apps still work without shared package)
7. **Create `packages/shared`** — scaffold package with extracted schemas from backend DTOs; build compiles
8. **Wire shared into apps** — add `@ragler/shared` dep to both apps, add TS project references, replace inline schemas with imports from shared; run `pnpm test`
9. **Update `next.config.ts`** — add `outputFileTracingRoot` pointing to monorepo root
10. **Update Dockerfiles** — rewrite `apps/backend/Dockerfile` and `apps/frontend/Dockerfile` for monorepo context; verify `docker compose build`
11. **Add dev Docker files** — create `docker-compose.dev.yml`, `apps/backend/Dockerfile.dev`, `apps/frontend/Dockerfile.dev`; verify `docker compose -f docker-compose.dev.yml up`
12. **Move `.changeset/`** — `git mv apps/backend/.changeset .changeset`; update `config.json`; remove `@changesets/cli` from backend devDeps
13. **Verify husky** — remove `prepare` from `apps/backend/package.json`; run `git commit --allow-empty -m "test hooks"`
14. **Final verification** — `pnpm build`, `pnpm test`, `docker compose build`, `docker compose -f docker-compose.dev.yml build`
15. **Atomic commit** — single commit per step or squash into logical chunks before merging

---

## 10. Out of Scope

- Adding new schemas not already present in the backend
- Changing API contracts
- CI/CD pipeline changes (GitHub Actions)
- Adding new features to either app
- Versioning strategy for `@ragler/shared` (starts as `private: true`, versioned via changesets if ever published)
