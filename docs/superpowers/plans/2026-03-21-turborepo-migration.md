# Turborepo Monorepo Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate ragler from two independent pnpm apps into a canonical Turborepo monorepo with a shared `@ragler/shared` package (Zod schemas + TypeScript types), plus dev and production Docker Compose stacks.

**Architecture:** Apps move to `apps/` prefix; shared Zod schemas extracted into `packages/shared` (compiles to `dist/`); root `turbo.json` orchestrates builds with `^build` dependency ordering; Dockerfiles updated to operate from monorepo root context.

**Tech Stack:** pnpm workspaces, Turborepo, TypeScript project references, NestJS, Next.js 16, Zod, Docker multi-stage builds

---

## File Map

### New files
| Path | Purpose |
|------|---------|
| `package.json` | Workspace root — turbo scripts, husky, changesets |
| `pnpm-workspace.yaml` | Declares `apps/*` and `packages/*` |
| `turbo.json` | Task pipeline (build, dev, lint, typecheck, test) |
| `packages/shared/package.json` | `@ragler/shared` manifest — compiled to `dist/` |
| `packages/shared/tsconfig.json` | `composite: true`, outDir dist |
| `packages/shared/src/index.ts` | Barrel export |
| `packages/shared/src/schemas/collection.schema.ts` | Collection CRUD schemas |
| `packages/shared/src/schemas/session.schema.ts` | Session, chunk, publish schemas |
| `packages/shared/src/schemas/ingest.schema.ts` | Ingest request/response schemas |
| `packages/shared/src/schemas/chat.schema.ts` | Chat request/response schemas |
| `packages/shared/src/schemas/index.ts` | Schemas barrel |
| `packages/shared/src/types/api.types.ts` | `ApiResponse<T>`, error envelope |
| `packages/shared/src/types/index.ts` | Types barrel |
| `apps/backend/Dockerfile` | Production multi-stage (replaces `backend/Dockerfile`) |
| `apps/backend/Dockerfile.dev` | Dev — installs deps only, source mounted |
| `apps/frontend/Dockerfile` | Production multi-stage (replaces `frontend/Dockerfile`) |
| `apps/frontend/Dockerfile.dev` | Dev — installs deps only, source mounted |
| `docker-compose.dev.yml` | Dev stack with hot-reload |

### Modified files
| Path | Change |
|------|--------|
| `docker-compose.yml` | Build contexts → `.` (monorepo root) |
| `apps/backend/tsconfig.json` | Add `references` to `packages/shared` |
| `apps/backend/package.json` | Add `@ragler/shared` dep; remove `@changesets/cli` + `prepare` |
| `apps/backend/src/modules/collection/dto/create-collection.dto.ts` | Import schema from `@ragler/shared` |
| `apps/backend/src/modules/collection/dto/collection-response.dto.ts` | Import schemas from `@ragler/shared` |
| `apps/backend/src/modules/session/dto/session.dto.ts` | Import schemas from `@ragler/shared` |
| `apps/backend/src/modules/ingest/dto/chunking-config.dto.ts` | Import from `@ragler/shared` |
| `apps/backend/src/modules/ingest/dto/ingest-web.dto.ts` | Import from `@ragler/shared` |
| `apps/backend/src/modules/ingest/dto/ingest-manual.dto.ts` | Import from `@ragler/shared` |
| `apps/backend/src/modules/ingest/dto/ingest.dto.ts` | Import from `@ragler/shared` |
| `apps/backend/src/modules/collection/dto/chat.dto.ts` | Import from `@ragler/shared` |
| `apps/backend/src/common/dto/error-response.dto.ts` | Import from `@ragler/shared` |
| `apps/frontend/tsconfig.json` | Add `references` to `packages/shared` |
| `apps/frontend/package.json` | Add `@ragler/shared` dep |
| `apps/frontend/next.config.mjs` | Add `outputFileTracingRoot` |
| `.husky/pre-commit` | Update path from `cd backend` → `cd apps/backend` (interim), then root turbo |

---

## Task 1: Snapshot and move apps

**Files:**
- Move: `backend/` → `apps/backend/`
- Move: `frontend/` → `apps/frontend/`

- [ ] **Step 1.1: Tag current state for rollback**

```bash
git tag pre-turborepo-migration
```

Expected: tag created. Verify with `git tag | grep pre-turborepo`.

- [ ] **Step 1.2: Create `apps/` directory and move backend**

```bash
mkdir -p apps
git mv backend apps/backend
```

- [ ] **Step 1.3: Move frontend**

```bash
git mv frontend apps/frontend
```

- [ ] **Step 1.4: Verify structure**

```bash
ls apps/
```

Expected: `backend  frontend`

- [ ] **Step 1.5: Fix the husky hook and backend `prepare` script immediately after git mv**

The backend's `prepare` script (`"cd .. && husky backend/.husky || true"`) will break after the move. Remove it now, before the next `pnpm install`.

Edit `apps/backend/package.json` — remove the `"prepare"` entry from `scripts`. (Full cleanup of changeset scripts happens in Task 3.)

Also update `.husky/pre-commit` to use the new interim path:
```bash
cd apps/backend && pnpm lint && pnpm typecheck && pnpm test
```

- [ ] **Step 1.6: Commit**

```bash
git add -A
git commit -m "chore(monorepo): move backend and frontend into apps/"
```

---

## Task 2: Create root workspace files

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`

- [ ] **Step 2.1: Create root `package.json`**

```json
{
  "name": "ragler",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "changeset": "changeset",
    "prepare": "husky"
  },
  "devDependencies": {
    "turbo": "latest",
    "husky": "^9.0.0",
    "@changesets/cli": "^2.29.8"
  }
}
```

- [ ] **Step 2.2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2.3: Create `turbo.json`**

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

- [ ] **Step 2.4: Commit workspace scaffolding**

```bash
git add package.json pnpm-workspace.yaml turbo.json
git commit -m "chore(monorepo): add root workspace files (pnpm, turbo)"
```

---

## Task 3: Install from root and verify tests

- [ ] **Step 3.1: Delete per-app lockfiles**

The per-app lockfiles are no longer valid — root pnpm will generate a single one.

```bash
rm apps/backend/pnpm-lock.yaml
rm apps/frontend/pnpm-lock.yaml
```

- [ ] **Step 3.2: Install all deps from root**

Run from the repo root:

```bash
pnpm install
```

Expected: installs all deps, creates `pnpm-lock.yaml` at root. Both `apps/backend/node_modules` and `apps/frontend/node_modules` are populated (pnpm workspace installs per-app node_modules using shared store).

- [ ] **Step 3.3: Install Turbo and husky**

```bash
pnpm install --save-dev turbo husky @changesets/cli -w
```

The `-w` flag installs at the workspace root.

- [ ] **Step 3.4: Initialize changesets at root**

```bash
pnpm changeset init
```

Expected: creates `.changeset/config.json` at root.

- [ ] **Step 3.5: Update `.changeset/config.json`**

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

- [ ] **Step 3.6: Verify backend tests still pass**

```bash
pnpm --filter @ragler/backend test
```

Expected: all tests pass. If you see module resolution errors, check that `moduleNameMapper` in `apps/backend/package.json` jest config uses correct paths (should still work since paths are relative to rootDir).

- [ ] **Step 3.7: Update husky pre-commit hook for final form**

Edit `.husky/pre-commit` to use root turbo commands:

```bash
pnpm lint && pnpm typecheck && pnpm test
```

This calls `turbo lint && turbo typecheck && turbo test` via root scripts, which runs across all packages.

- [ ] **Step 3.8: Remove `prepare` and `changeset` scripts from `apps/backend/package.json`**

Edit `apps/backend/package.json` and delete these entries from `scripts`:
```json
// Remove:
"prepare": "cd .. && husky backend/.husky || true",
"changeset": "changeset",
"version": "changeset version",
"release": "changeset publish",
```

- [ ] **Step 3.9: Remove `@changesets/cli` from backend devDependencies**

Edit `apps/backend/package.json` and remove `"@changesets/cli"` from `devDependencies`. It now lives at workspace root.

Run `pnpm install` to update lockfile.

- [ ] **Step 3.10: Delete `apps/frontend/package-lock.json` if it exists**

```bash
rm -f apps/frontend/package-lock.json
```

npm lockfiles coexist with pnpm and cause confusion in CI. This removes it.

- [ ] **Step 3.10: Commit**

```bash
git add -A
git commit -m "chore(monorepo): single root lockfile, changesets at root, husky update"
```

---

## Task 4: Scaffold `@ragler/shared`

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts` (empty barrel)
- Create: `packages/shared/src/schemas/index.ts`
- Create: `packages/shared/src/types/index.ts`
- Create: `packages/shared/src/types/api.types.ts`

- [ ] **Step 4.1: Create directory structure**

```bash
mkdir -p packages/shared/src/schemas
mkdir -p packages/shared/src/types
```

- [ ] **Step 4.2: Create `packages/shared/package.json`**

> **Zod version note:** The backend uses `zod ^3.23.0`; the frontend uses `zod ^4.1.13`. The shared package accepts both via a wide peer dependency range. The schemas use the basic Zod API (`z.object`, `z.string`, `z.array`, `z.enum`, `.optional()`, `.nullable()`, `.refine()`) which is compatible with both v3 and v4. The shared package is compiled with v3 as its devDependency (aligning with the backend).

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
  "peerDependencies": {
    "zod": ">=3.22.0 <5.0.0"
  },
  "devDependencies": {
    "zod": "^3.23.0",
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 4.3: Create `packages/shared/tsconfig.json`**

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
    "target": "ES2020",
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4.4: Create `packages/shared/src/types/api.types.ts`**

```typescript
import { z } from 'zod';

export const ErrorResponseSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.union([z.string(), z.array(z.string())]),
  timestamp: z.string(),
  path: z.string(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export interface ApiResponse<T> {
  data: T;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

- [ ] **Step 4.5: Create `packages/shared/src/types/index.ts`**

```typescript
export * from './api.types';
```

- [ ] **Step 4.6: Create empty schema barrel `packages/shared/src/schemas/index.ts`**

```typescript
// schemas are added in subsequent tasks
```

- [ ] **Step 4.7: Create `packages/shared/src/index.ts`**

```typescript
export * from './schemas';
export * from './types';
```

- [ ] **Step 4.8: Install shared's own deps**

```bash
pnpm install --filter @ragler/shared
```

- [ ] **Step 4.9: Verify shared builds**

```bash
pnpm --filter @ragler/shared build
```

Expected: `packages/shared/dist/` is created with `index.js`, `index.d.ts`.

- [ ] **Step 4.10: Add `packages/shared/dist` to `.gitignore`**

Check `apps/backend/.gitignore` and `apps/frontend/.gitignore` for the `dist` pattern. Add a root `.gitignore` or add to the existing one:

```
# root .gitignore (create if not exists)
packages/shared/dist/
packages/shared/tsconfig.tsbuildinfo
```

- [ ] **Step 4.11: Commit**

```bash
git add packages/shared .gitignore
git commit -m "feat(shared): scaffold @ragler/shared package with build config"
```

---

## Task 5: Extract collection schemas

**Files:**
- Create: `packages/shared/src/schemas/collection.schema.ts`
- Modify: `packages/shared/src/schemas/index.ts`

- [ ] **Step 5.1: Create `packages/shared/src/schemas/collection.schema.ts`**

Extract the schemas verbatim from the backend DTO files (no logic changes — same rules):

```typescript
import { z } from 'zod';

// --- Create ---
export const CreateCollectionSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
});

export type CreateCollectionInput = z.infer<typeof CreateCollectionSchema>;

// --- Read ---
export const CollectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export type Collection = z.infer<typeof CollectionSchema>;

export const CollectionListSchema = z.object({
  collections: z.array(CollectionSchema),
  total: z.number().int().nonnegative(),
});

export type CollectionList = z.infer<typeof CollectionListSchema>;
```

- [ ] **Step 5.2: Update `packages/shared/src/schemas/index.ts`**

```typescript
export * from './collection.schema';
```

- [ ] **Step 5.3: Build and verify**

```bash
pnpm --filter @ragler/shared build
```

Expected: builds without errors. `dist/schemas/collection.schema.d.ts` is generated.

- [ ] **Step 5.4: Commit**

```bash
git add packages/shared/src/schemas/
git commit -m "feat(shared): add collection schemas to @ragler/shared"
```

---

## Task 6: Extract session schemas

**Files:**
- Create: `packages/shared/src/schemas/session.schema.ts`
- Modify: `packages/shared/src/schemas/index.ts`

> **Important distinction:** There are TWO chunk-related files in the backend:
> - `apps/backend/src/modules/session/dto/session.dto.ts` — contains the simple `ChunkSchema` (`{id, text, isDirty}`) — **this is the one we extract**
> - `apps/backend/src/modules/collection/dto/chunk.dto.ts` — contains `EditorChunkResponseSchema` which imports from the vector module (`payload.dto.ts`) — **this stays backend-only**
>
> Only the session module's `ChunkSchema` goes into shared. The collection chunk editor schemas remain internal to the backend.

- [ ] **Step 6.1: Create `packages/shared/src/schemas/session.schema.ts`**

```typescript
import { z } from 'zod';

// --- Core chunk ---
export const ChunkSchema = z.object({
  id: z.string(),
  text: z.string(),
  isDirty: z.boolean(),
});

export type Chunk = z.infer<typeof ChunkSchema>;

// --- Session response ---
export const SessionResponseSchema = z.object({
  sessionId: z.string(),
  sourceUrl: z.string(),
  sourceType: z.enum(['manual', 'web', 'file']),
  status: z.string(),
  chunks: z.array(ChunkSchema),
  /**
   * Raw HTML/XML content for source preview.
   * Present for web (HTML) sources.
   * null for manual text and file sources.
   * WARNING: Must be sanitized (e.g., DOMPurify) before rendering in browser.
   */
  rawContent: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;

// --- Session list ---
export const SessionListItemSchema = z.object({
  sessionId: z.string(),
  sourceUrl: z.string(),
  sourceType: z.enum(['manual', 'web', 'file']),
  status: z.string(),
  chunkCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SessionListItem = z.infer<typeof SessionListItemSchema>;

export const SessionListResponseSchema = z.object({
  sessions: z.array(SessionListItemSchema),
  total: z.number().int().nonnegative(),
});

export type SessionListResponse = z.infer<typeof SessionListResponseSchema>;

// --- Chunk mutations ---
export const MergeChunksSchema = z.object({
  chunkIds: z
    .array(z.string())
    .min(2, 'At least 2 chunks are required for merge'),
});

export type MergeChunksInput = z.infer<typeof MergeChunksSchema>;

export const SplitChunkSchema = z
  .object({
    splitPoints: z.array(z.number()).optional(),
    newTextBlocks: z.array(z.string()).optional(),
  })
  .refine(
    (data) => data.splitPoints || data.newTextBlocks,
    { message: 'Either splitPoints or newTextBlocks must be provided' },
  );

export type SplitChunkInput = z.infer<typeof SplitChunkSchema>;

export const UpdateChunkSchema = z.object({
  text: z.string().min(1, 'Text is required'),
});

export type UpdateChunkInput = z.infer<typeof UpdateChunkSchema>;

// --- Publish ---
export const PublishSchema = z.object({
  targetCollectionId: z.string().uuid('Invalid collection ID format'),
});

export type PublishInput = z.infer<typeof PublishSchema>;

export const PreviewResponseSchema = z.object({
  sessionId: z.string(),
  status: z.string(),
  chunks: z.array(ChunkSchema),
  isValid: z.boolean(),
  warnings: z.array(z.string()),
});

export type PreviewResponse = z.infer<typeof PreviewResponseSchema>;

export const PublishResponseSchema = z.object({
  sessionId: z.string(),
  publishedChunks: z.number().int().nonnegative(),
  collectionId: z.string(),
});

export type PublishResponse = z.infer<typeof PublishResponseSchema>;

export const DeleteSessionResponseSchema = z.object({
  sessionId: z.string(),
  deleted: z.boolean(),
});

export type DeleteSessionResponse = z.infer<typeof DeleteSessionResponseSchema>;
```

- [ ] **Step 6.2: Update `packages/shared/src/schemas/index.ts`**

```typescript
export * from './collection.schema';
export * from './session.schema';
```

- [ ] **Step 6.3: Build and verify**

```bash
pnpm --filter @ragler/shared build
```

Expected: no errors.

- [ ] **Step 6.4: Commit**

```bash
git add packages/shared/src/schemas/
git commit -m "feat(shared): add session and chunk schemas to @ragler/shared"
```

---

## Task 7: Extract ingest schemas

**Files:**
- Create: `packages/shared/src/schemas/ingest.schema.ts`
- Modify: `packages/shared/src/schemas/index.ts`

- [ ] **Step 7.1: Create `packages/shared/src/schemas/ingest.schema.ts`**

```typescript
import { z } from 'zod';

// --- Chunking config (shared between web and manual ingest) ---
export const ChunkingConfigSchema = z.object({
  method: z.enum(['llm', 'character']).default('llm'),
  chunkSize: z.number().int().min(100).max(10000).default(1000),
  overlap: z.number().int().min(0).max(2000).default(200),
}).optional();

export type ChunkingConfig = z.infer<typeof ChunkingConfigSchema>;

// --- Source type enum ---
export const SourceTypeEnum = z.enum(['web', 'manual', 'file']);
export type SourceType = z.infer<typeof SourceTypeEnum>;

// --- Ingest requests ---
export const IngestWebSchema = z.object({
  url: z.string().url('Invalid URL format'),
  chunkingConfig: ChunkingConfigSchema,
});

export type IngestWebInput = z.infer<typeof IngestWebSchema>;

export const IngestManualSchema = z.object({
  content: z
    .string()
    .min(1, 'Content cannot be empty')
    .max(102400, 'Content exceeds maximum length of 100KB'),
  chunkingConfig: ChunkingConfigSchema,
});

export type IngestManualInput = z.infer<typeof IngestManualSchema>;

// --- Ingest response ---
export const IngestResponseSchema = z.object({
  sessionId: z.string(),
  sourceType: SourceTypeEnum,
  sourceUrl: z.string(),
  status: z.string(),
  createdAt: z.string(),
});

export type IngestResponse = z.infer<typeof IngestResponseSchema>;
```

- [ ] **Step 7.2: Update `packages/shared/src/schemas/index.ts`**

```typescript
export * from './collection.schema';
export * from './session.schema';
export * from './ingest.schema';
```

- [ ] **Step 7.3: Build and verify**

```bash
pnpm --filter @ragler/shared build
```

- [ ] **Step 7.4: Commit**

```bash
git add packages/shared/src/schemas/
git commit -m "feat(shared): add ingest schemas to @ragler/shared"
```

---

## Task 8: Extract chat schemas

**Files:**
- Create: `packages/shared/src/schemas/chat.schema.ts`
- Modify: `packages/shared/src/schemas/index.ts`

- [ ] **Step 8.1: Create `packages/shared/src/schemas/chat.schema.ts`**

```typescript
import { z } from 'zod';

export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(5000),
  sessionId: z.string().optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatCitationSchema = z.object({
  chunkId: z.string(),
  content: z.string(),
  score: z.number(),
});

export type ChatCitation = z.infer<typeof ChatCitationSchema>;

export const ChatResponseSchema = z.object({
  answer: z.string(),
  sessionId: z.string(),
  citations: z.array(ChatCitationSchema),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;
```

- [ ] **Step 8.2: Update `packages/shared/src/schemas/index.ts`**

```typescript
export * from './collection.schema';
export * from './session.schema';
export * from './ingest.schema';
export * from './chat.schema';
```

- [ ] **Step 8.3: Build and verify full shared package**

```bash
pnpm --filter @ragler/shared build
```

Expected: `dist/` contains all schemas and types. No TypeScript errors.

- [ ] **Step 8.4: Commit**

```bash
git add packages/shared/src/schemas/
git commit -m "feat(shared): add chat schemas to @ragler/shared"
```

---

## Task 9: Wire `@ragler/shared` into backend

**Files:**
- Modify: `apps/backend/package.json`
- Modify: `apps/backend/tsconfig.json`
- Modify: `apps/backend/src/modules/collection/dto/create-collection.dto.ts`
- Modify: `apps/backend/src/modules/collection/dto/collection-response.dto.ts`
- Modify: `apps/backend/src/modules/session/dto/session.dto.ts`
- Modify: `apps/backend/src/modules/ingest/dto/chunking-config.dto.ts`
- Modify: `apps/backend/src/modules/ingest/dto/ingest-web.dto.ts`
- Modify: `apps/backend/src/modules/ingest/dto/ingest-manual.dto.ts`
- Modify: `apps/backend/src/modules/ingest/dto/ingest.dto.ts`
- Modify: `apps/backend/src/modules/collection/dto/chat.dto.ts`
- Modify: `apps/backend/src/common/dto/error-response.dto.ts`

- [ ] **Step 9.1: Add `@ragler/shared` to backend dependencies**

Edit `apps/backend/package.json`, add to `dependencies`:

```json
"@ragler/shared": "workspace:*"
```

Run `pnpm install` from root to link the workspace package.

- [ ] **Step 9.2: Add TypeScript project reference to backend**

Edit `apps/backend/tsconfig.json`, add `references` after the closing bracket of `compilerOptions`:

```json
{
  "compilerOptions": { ... },
  "references": [{ "path": "../../packages/shared" }],
  "include": ["src/**/*", "test/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 9.3: Update `create-collection.dto.ts`**

```typescript
import { createZodDto } from 'nestjs-zod';
import {
  CreateCollectionSchema,
  type CreateCollectionInput,
} from '@ragler/shared';

export { CreateCollectionSchema, type CreateCollectionInput };
export class CreateCollectionDto extends createZodDto(CreateCollectionSchema) {}
```

- [ ] **Step 9.4: Update `collection-response.dto.ts`**

```typescript
import { createZodDto } from 'nestjs-zod';
import {
  CollectionSchema,
  CollectionListSchema,
  type Collection,
  type CollectionList,
} from '@ragler/shared';

export {
  CollectionSchema,
  CollectionListSchema,
  type Collection,
  type CollectionList,
};
export class CollectionResponseDto extends createZodDto(CollectionSchema) {}
export class CollectionListResponseDto extends createZodDto(CollectionListSchema) {}
```

- [ ] **Step 9.5: Update `session.dto.ts`**

```typescript
import { createZodDto } from 'nestjs-zod';
import {
  ChunkSchema,
  SessionResponseSchema,
  MergeChunksSchema,
  SplitChunkSchema,
  UpdateChunkSchema,
  PublishSchema,
  PreviewResponseSchema,
  PublishResponseSchema,
  SessionListItemSchema,
  SessionListResponseSchema,
  DeleteSessionResponseSchema,
  type Chunk,
  type SessionResponse,
  type MergeChunksInput,
  type SplitChunkInput,
  type UpdateChunkInput,
  type PublishInput,
  type PreviewResponse,
  type PublishResponse,
  type SessionListItem,
  type SessionListResponse,
  type DeleteSessionResponse,
} from '@ragler/shared';

export {
  ChunkSchema,
  type Chunk,
  type SessionResponse,
  type MergeChunksInput,
  type SplitChunkInput,
  type UpdateChunkInput,
  type PublishInput,
  type PreviewResponse,
  type PublishResponse,
  type SessionListItem,
  type SessionListResponse,
  type DeleteSessionResponse,
};

export type ChunkDto = Chunk;
export class SessionResponseDto extends createZodDto(SessionResponseSchema) {}
export class MergeChunksDto extends createZodDto(MergeChunksSchema) {}
export class SplitChunkDto extends createZodDto(SplitChunkSchema) {}
export class UpdateChunkDto extends createZodDto(UpdateChunkSchema) {}
export class PublishDto extends createZodDto(PublishSchema) {}
export class PreviewResponseDto extends createZodDto(PreviewResponseSchema) {}
export class PublishResponseDto extends createZodDto(PublishResponseSchema) {}
export class SessionListItemDto extends createZodDto(SessionListItemSchema) {}
export class SessionListResponseDto extends createZodDto(SessionListResponseSchema) {}
export class DeleteSessionResponseDto extends createZodDto(DeleteSessionResponseSchema) {}
```

- [ ] **Step 9.6: Update `chunking-config.dto.ts`**

```typescript
import { ChunkingConfigSchema, type ChunkingConfig } from '@ragler/shared';

export { ChunkingConfigSchema, type ChunkingConfig };
```

- [ ] **Step 9.7: Update `ingest-web.dto.ts`**

```typescript
import { createZodDto } from 'nestjs-zod';
import { IngestWebSchema } from '@ragler/shared';

export { IngestWebSchema };
export class IngestWebDto extends createZodDto(IngestWebSchema) {}
```

- [ ] **Step 9.8: Update `ingest-manual.dto.ts`**

```typescript
import { createZodDto } from 'nestjs-zod';
import { IngestManualSchema } from '@ragler/shared';

export { IngestManualSchema };
export class IngestManualDto extends createZodDto(IngestManualSchema) {}
```

- [ ] **Step 9.9: Update `ingest.dto.ts`**

```typescript
import { createZodDto } from 'nestjs-zod';
import {
  SourceTypeEnum,
  IngestResponseSchema,
  type SourceType,
  type IngestResponse,
} from '@ragler/shared';

export { SourceTypeEnum, type SourceType, type IngestResponse };
export * from './ingest-web.dto';
export * from './ingest-manual.dto';

export class IngestResponseDto extends createZodDto(IngestResponseSchema) {}
```

- [ ] **Step 9.10: Update `chat.dto.ts`**

```typescript
import { createZodDto } from 'nestjs-zod';
import {
  ChatRequestSchema,
  ChatCitationSchema,
  ChatResponseSchema,
  type ChatRequest,
  type ChatCitation,
  type ChatResponse,
} from '@ragler/shared';

export {
  ChatRequestSchema,
  type ChatRequest,
  type ChatCitation,
  type ChatResponse,
};

export class ChatRequestDto extends createZodDto(ChatRequestSchema) {}
export class ChatResponseDto extends createZodDto(ChatResponseSchema) {}
export type { ChatCitation };
```

- [ ] **Step 9.11: Update `error-response.dto.ts`**

```typescript
import { createZodDto } from 'nestjs-zod';
import { ErrorResponseSchema, type ErrorResponse } from '@ragler/shared';

export { ErrorResponseSchema, type ErrorResponse };
export class ErrorResponseDto extends createZodDto(ErrorResponseSchema) {}
```

- [ ] **Step 9.12: Run backend typecheck**

```bash
pnpm --filter @ragler/backend typecheck
```

Expected: no errors. If there are import errors — verify `@ragler/shared` was built (`packages/shared/dist/` exists) and the workspace link is in place (`ls apps/backend/node_modules/@ragler/`).

- [ ] **Step 9.13: Run backend tests**

```bash
pnpm --filter @ragler/backend test
```

Expected: all tests pass.

- [ ] **Step 9.14: Commit**

```bash
git add apps/backend/
git commit -m "feat(backend): consume @ragler/shared schemas in DTOs"
```

---

## Task 10: Wire `@ragler/shared` into frontend

**Files:**
- Modify: `apps/frontend/package.json`
- Modify: `apps/frontend/tsconfig.json`

- [ ] **Step 10.1: Add `@ragler/shared` to frontend dependencies**

Edit `apps/frontend/package.json`, add to `dependencies`:

```json
"@ragler/shared": "workspace:*"
```

Run `pnpm install` from root.

- [ ] **Step 10.2: Add TypeScript project reference to frontend**

Edit `apps/frontend/tsconfig.json`, add `references`:

```json
{
  "compilerOptions": { ... },
  "references": [{ "path": "../../packages/shared" }],
  "include": [...],
  "exclude": [...]
}
```

- [ ] **Step 10.3: Find existing inline Zod schemas in frontend**

Search for any inline Zod schemas in the frontend that duplicate the shared schemas:

```bash
grep -r "z\.object\|z\.string\|z\.enum" apps/frontend/src --include="*.ts" --include="*.tsx" -l
```

For each file found: replace inline schema definitions with imports from `@ragler/shared`. Example:

```typescript
// Before (inline)
import { z } from 'zod';
const createCollectionSchema = z.object({ name: z.string().min(1) });

// After (shared)
import { CreateCollectionSchema } from '@ragler/shared';
```

Note: if the frontend has no inline Zod schemas yet, this step is a no-op — skip to step 10.4.

- [ ] **Step 10.4: Run frontend typecheck**

```bash
pnpm --filter @ragler/frontend typecheck
```

Expected: no errors. The `@ragler/shared` types resolve via pnpm workspace symlink → `dist/index.d.ts`.

- [ ] **Step 10.5: Commit**

```bash
git add apps/frontend/
git commit -m "feat(frontend): add @ragler/shared dependency and TS project reference"
```

---

## Task 11: Update `next.config.mjs` for monorepo

**Files:**
- Modify: `apps/frontend/next.config.mjs`

This is required for Next.js standalone output to correctly bundle files from outside the app directory (i.e., `packages/shared`).

- [ ] **Step 11.1: Update `apps/frontend/next.config.mjs`**

```javascript
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  output: 'standalone',
  // Required for monorepo: traces files from repo root, not just app dir
  outputFileTracingRoot: path.join(__dirname, '../../'),

  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3010';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 11.2: Verify frontend builds locally (optional)**

```bash
pnpm --filter @ragler/shared build && pnpm --filter @ragler/frontend build
```

Expected: builds without errors. `.next/` directory created in `apps/frontend/`.

- [ ] **Step 11.3: Commit**

```bash
git add apps/frontend/next.config.mjs
git commit -m "feat(frontend): set outputFileTracingRoot for monorepo standalone build"
```

---

## Task 12: Update production Dockerfiles

**Files:**
- Modify (rewrite): `apps/backend/Dockerfile`
- Modify (rewrite): `apps/frontend/Dockerfile`
- Modify: `docker-compose.yml`

- [ ] **Step 12.1: Rewrite `apps/backend/Dockerfile`**

```dockerfile
# Stage 1: Build — needs build tools for native addons (better-sqlite3) + tsc
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests — layer-cached until any package.json changes
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Build shared first (required by backend build)
RUN pnpm --filter @ragler/shared build
RUN pnpm --filter @ragler/backend build

# Stage 2: Production deps — separate install so native addon compiles clean
FROM node:20-alpine AS deps

WORKDIR /app

RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json

RUN pnpm install --prod --frozen-lockfile

# Recompile better-sqlite3 native addon for this runtime image
RUN cd /app/node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 \
    && npx --yes node-gyp rebuild

# Copy compiled shared dist (needed at runtime)
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY packages/shared/package.json ./packages/shared/package.json

# Stage 3: Minimal runtime image
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

- [ ] **Step 12.2: Rewrite `apps/frontend/Dockerfile`**

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

# Stage 3: Minimal runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/frontend/public ./public

RUN mkdir .next && chown nextjs:nodejs .next

# Standalone output with outputFileTracingRoot — bundle is self-contained
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

- [ ] **Step 12.3: Update `docker-compose.yml` build contexts**

```yaml
services:
  api:
    image: ghcr.io/scrobot/ragler/backend:latest
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    ports:
      - "3010:3000"
      - "3100:3100"
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

- [ ] **Step 12.4: Test production Docker build**

```bash
docker compose build api
```

Expected: builds successfully. Takes several minutes first time (downloading base images, installing deps, compiling native addon).

```bash
docker compose build frontend
```

Expected: builds successfully.

- [ ] **Step 12.5: Commit**

```bash
git add apps/backend/Dockerfile apps/frontend/Dockerfile docker-compose.yml
git commit -m "chore(docker): update production Dockerfiles for monorepo root context"
```

---

## Task 13: Create dev Docker stack

**Files:**
- Create: `apps/backend/Dockerfile.dev`
- Create: `apps/frontend/Dockerfile.dev`
- Create: `docker-compose.dev.yml`

- [ ] **Step 13.1: Create `apps/backend/Dockerfile.dev`**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Build tools required for better-sqlite3 native addon
RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests — reinstall when any package.json changes
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json

RUN pnpm install --frozen-lockfile

# Source code is mounted at runtime via docker-compose.dev.yml volumes.
# The CMD is provided by docker-compose.dev.yml (pnpm --filter @ragler/backend start:dev).
```

- [ ] **Step 13.2: Create `apps/frontend/Dockerfile.dev`**

```dockerfile
FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/backend/package.json ./apps/backend/package.json

RUN pnpm install --frozen-lockfile

# Source code is mounted at runtime via docker-compose.dev.yml volumes.
# The CMD is provided by docker-compose.dev.yml (pnpm --filter @ragler/frontend dev).
```

- [ ] **Step 13.3: Create `docker-compose.dev.yml`**

```yaml
services:
  api:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile.dev
    volumes:
      # Bind-mount source — changes on host appear in container
      - ./apps/backend:/app/apps/backend
      - ./packages/shared:/app/packages/shared
      # Named volume prevents host node_modules from overriding container's
      # (host is macOS/Windows, container is Linux — incompatible native binaries)
      - backend_node_modules:/app/node_modules
    ports:
      - "3010:3000"
      - "3100:3100"
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
  # Note: packages/shared is bind-mounted. It has no runtime node_modules
  # (zod is a peerDep satisfied by apps). No shared_node_modules volume needed.
```

- [ ] **Step 13.4: Pre-build shared before first dev container start**

On the host, before running dev containers, shared `dist/` must exist:

```bash
pnpm --filter @ragler/shared build
```

Expected: `packages/shared/dist/` populated.

- [ ] **Step 13.5: Test dev Docker build**

```bash
docker compose -f docker-compose.dev.yml build
```

Expected: both images build successfully.

- [ ] **Step 13.6: Smoke test dev stack**

```bash
docker compose -f docker-compose.dev.yml up api redis qdrant
```

Expected: backend starts with `[NestApplication] Nest application successfully started`. Hot-reload is active — edit a `.ts` file in `apps/backend/src/` and see the process restart.

Stop with `Ctrl+C`.

- [ ] **Step 13.7: Commit**

```bash
git add apps/backend/Dockerfile.dev apps/frontend/Dockerfile.dev docker-compose.dev.yml
git commit -m "feat(docker): add development Docker stack with hot-reload"
```

---

## Task 14: Final husky update and verification

- [ ] **Step 14.1: Update husky pre-commit to run from root**

`.husky/pre-commit` currently runs `cd apps/backend && ...`. Update to use root turbo:

```bash
pnpm lint && pnpm typecheck && pnpm test
```

This calls `turbo lint`, `turbo typecheck`, `turbo test` which run across all packages in dependency order.

- [ ] **Step 14.2: Verify husky hook fires correctly**

```bash
git commit --allow-empty -m "test: verify husky hook"
```

Expected: lint, typecheck, and tests run across all packages. Commit is created (or rejected if there are errors).

- [ ] **Step 14.3: Commit husky update**

```bash
git add .husky/pre-commit
git commit -m "chore(hooks): update pre-commit to run turbo tasks from root"
```

---

## Task 15: Final verification

- [ ] **Step 15.1: Full turbo build**

```bash
pnpm build
```

Expected: `@ragler/shared` builds first, then `@ragler/backend` and `@ragler/frontend` in parallel. All succeed.

- [ ] **Step 15.2: Full test run**

```bash
pnpm test
```

Expected: all backend tests pass. Frontend has no tests (passes with `--passWithNoTests` equivalent).

- [ ] **Step 15.3: Typecheck all packages**

```bash
pnpm typecheck
```

Expected: no errors in any package.

- [ ] **Step 15.4: Production Docker build**

```bash
docker compose build
```

Expected: both `api` and `frontend` images build successfully.

- [ ] **Step 15.5: Dev Docker build**

```bash
docker compose -f docker-compose.dev.yml build
```

Expected: both dev images build successfully.

- [ ] **Step 15.6: Final commit**

```bash
git add -A
git commit -m "chore(monorepo): Turborepo migration complete — @ragler/shared, dev+prod Docker"
```

---

## CI Prerequisites (out of scope — document only)

If CI runs `pnpm build` on a clean clone, add this step **before** `pnpm build` in the CI workflow:

```yaml
- name: Build shared package
  run: pnpm --filter @ragler/shared build
```

Or rely on Turbo's `^build` dependency: `turbo build` already runs `@ragler/shared#build` first. If CI uses `turbo build` (via root `pnpm build` script), this is handled automatically. Only add the explicit step if CI runs per-app builds directly.

---

## Developer Onboarding (after migration)

Add to `README.md`:

```markdown
## Getting Started

### Local development (native)
\`\`\`bash
pnpm install               # Install all workspace deps
pnpm --filter @ragler/shared build  # Build shared package (required once)
pnpm dev                   # Start all apps with hot-reload (turbo)
\`\`\`

### Local development (Docker)
\`\`\`bash
pnpm --filter @ragler/shared build  # Required on cold start
docker compose -f docker-compose.dev.yml up
\`\`\`

### Production
\`\`\`bash
docker compose up
\`\`\`

### Adding a new dep to a package
\`\`\`bash
pnpm --filter @ragler/backend add some-package
# Then re-run docker compose -f docker-compose.dev.yml up --build if using Docker
\`\`\`
```
