---
name: roles-modes-rbac
description: Enforces role-based access and Simple vs Advanced mode
---

Rules:
- L2 users operate ONLY in Simple Mode
- Simple Mode:
  - no split
  - no merge
  - no source reprocessing
- Advanced Mode (DEV / ML):
  - full chunk structure access

Implementation rules:
- UI hides forbidden actions
- API MUST reject forbidden calls
- Backend is the source of truth

Never rely on frontend-only enforcement.