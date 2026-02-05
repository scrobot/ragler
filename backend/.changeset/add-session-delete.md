---
"kms-rag-backend": minor
---

Add session delete functionality

- Add DELETE /session/:id endpoint to allow users to delete draft sessions
- Sessions in DRAFT or PREVIEW status can be deleted
- Published sessions cannot be deleted (they are already removed after publish)
- Frontend SessionList now includes delete button with confirmation dialog
