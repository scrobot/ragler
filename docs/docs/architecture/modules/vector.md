# Module: Vector

## Purpose

Store and query published knowledge vectors in Qdrant.

## Responsibilities

- Upsert/delete points during publish
- Search by query and collection
- Return ranked results with metadata

## Endpoint

- `POST /api/search`

## Verify

- Published content returns from search with non-zero scores.
