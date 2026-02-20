# Data Model

## What this page is for

Explain where draft and published knowledge state lives.

## Draft state (Redis)

Session object tracks:

- `sessionId`
- `sourceType`, `sourceUrl`
- `status`
- `chunks[]` with editable text
- timestamps

## Published state (Qdrant)

Published chunks include:

- vector embedding
- chunk content
- document metadata (`doc.*`)
- chunk metadata (`chunk.*`)
- tags and editor metadata

## Lifecycle

1. Ingest creates draft session.
2. Session edits mutate Redis state.
3. Publish writes/updates Qdrant points.
