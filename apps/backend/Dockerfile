# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools required for native addons (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (native addons compile here)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Production dependencies stage — separate install with build tools
FROM node:20-alpine AS deps

WORKDIR /app

# Install build tools required for native addons (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Force compile better-sqlite3 native addon from source
RUN cd /app/node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && npx --yes node-gyp rebuild

# Production stage — clean, no build tools
FROM node:20-alpine AS production

WORKDIR /app

# Copy package.json for runtime metadata
COPY --from=builder /app/package.json ./

# Copy production node_modules with compiled native bindings
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/main"]
