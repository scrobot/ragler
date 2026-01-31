---
name: draft-session-lifecycle
description: Manages Redis draft sessions safely
---

Session lifecycle:
- DRAFT → PREVIEW → PUBLISHED

Rules:
- All edits happen ONLY in Redis
- Preview locks the session (read-only)
- Publish deletes Redis session after success
- Source ID is immutable within a session
- Structural edits only allowed in Advanced Mode

Invalid transitions MUST be rejected.