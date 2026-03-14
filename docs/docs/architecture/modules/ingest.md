# Module: Ingest

## Purpose

Create draft sessions from source content.

## Endpoints

- `POST /api/ingest/web`
- `POST /api/ingest/manual`
- `POST /api/ingest/file`

## Responsibilities

- Normalize source input.
- Fetch/extract content.
- Initialize session state.

## Verify

- Ingest call returns `sessionId`.
- Session can be fetched via `/api/session/:id`.
