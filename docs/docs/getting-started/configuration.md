---
sidebar_position: 2
title: Configuration
---

# Configuration

## What this page is for

Configure backend runtime for ingestion, sessions, and publishing.

## Prerequisites

- Installed backend and running Docker dependencies.

## Steps

1. Create local env file.

```bash
cp .env.example .env
```

2. Configure required values.

- `OPENAI_API_KEY`
- `REDIS_HOST`
- `QDRANT_URL`

3. Adjust optional operational values as needed.

- `PORT`, `THROTTLE_TTL`, `THROTTLE_LIMIT`
- `SESSION_TTL`
- `WEB_FETCH_TIMEOUT`, `WEB_MAX_CONTENT_LENGTH`
- `CONFLUENCE_BASE_URL`, `CONFLUENCE_USER_EMAIL`, `CONFLUENCE_API_TOKEN`

4. Restart backend after edits.

## Verify

- Startup has no env validation errors.
- `GET /api/health/readiness` returns healthy checks.

## Troubleshooting

- Confluence ingest errors: ensure all `CONFLUENCE_*` values are set together.
- Large manual payload errors: review `MANUAL_MAX_CONTENT_LENGTH`.

## Next steps

- `/docs/getting-started/first-collection`
