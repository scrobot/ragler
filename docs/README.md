# RAGler Docs Site

Docusaurus site for product, architecture, and operational documentation.

## What This Is For

Use this package to edit and publish project documentation under `docs/docs`.

## Prerequisites

- Node.js 20+
- pnpm

## Local Development

```bash
pnpm install
pnpm start
```

## Build and Validate

```bash
pnpm build
```

If build fails, fix broken links/frontmatter issues before merge.

## Docs Workflow

1. Update docs under `docs/docs/**`.
2. Keep examples aligned with real API routes and DTO fields.
3. Build locally before opening PR.

## Common Commands

```bash
pnpm typecheck
pnpm clear
pnpm serve
```
