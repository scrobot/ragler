# RAGler Frontend

Next.js UI for collection management, sessions, and publishing workflows.

## TL;DR

```bash
pnpm install
pnpm dev
```

Default URL: `http://localhost:3001` (or Next.js default port output).

## Prerequisites

- Node.js 20+
- pnpm
- Running backend API (`http://localhost:3000/api`)

## Quick Start

1. Install dependencies.

```bash
pnpm install
```

2. Configure API URL (recommended).

```bash
echo 'NEXT_PUBLIC_API_URL=http://localhost:3000/api' > .env.local
```

3. Start dev server.

```bash
pnpm dev
```

## Verify

- Open the app in browser.
- Confirm collections and sessions load from backend.
- If API calls fail, inspect browser network and `NEXT_PUBLIC_API_URL`.

## Common Tasks

```bash
pnpm lint
pnpm build
pnpm start
```

## Troubleshooting

- Empty data/state errors: backend not running or wrong API URL.
- 404s on API from browser: ensure URL includes `/api` suffix.
