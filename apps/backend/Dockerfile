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
