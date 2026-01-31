---
trigger: manual
glob:
description: Validate implementation against business requirements and architecture
---

# Logic Validation Guide

Use this guide to verify that code implementation corresponds to business requirements (BRD) and solution architecture (SAD).

---

## Before Validation

**MANDATORY:** Read the source documents first:
1. `docs/brd.md` — Business Requirements Document
2. `docs/sad.md` — Solution Architecture Document

Do not validate from memory. Always reference the actual documents.

---

## Validation Process

### Step 1: Identify What to Validate

Determine the scope of validation:
- Specific feature or module
- API endpoint
- User flow
- Full implementation audit

### Step 2: BRD Correspondence Check

For the code under review, verify:

1. **Role & Mode Enforcement**
   - Does the code respect Simple Mode vs Advanced Mode restrictions?
   - Are role-based capabilities enforced per the Capabilities Matrix (BRD §7.2)?
   - Are restricted operations blocked for L2 Support (split/merge, collection management)?

2. **Primary Flow Implementation**
   - Does the implementation support the Primary Flows (BRD §8)?
   - Is the flow sequence correct?
   - Are all mandatory steps present (e.g., collection selection before save)?

3. **MVP Scope Compliance**
   - Is the feature within MVP scope (BRD §9.1)?
   - Does it avoid out-of-scope items (BRD §9.2)?

4. **Core Business Rules**
   - LLM output is proposal-based only (user must confirm)
   - No automatic application of LLM suggestions
   - Collection must be selected before publishing

### Step 3: SAD Architecture Check

For the code under review, verify:

1. **Storage Model**
   - Drafts stored in Redis (not Qdrant)
   - Published data stored in Qdrant
   - Collection naming follows `kb_{uuid}` pattern
   - System registry uses `sys_registry` collection

2. **Atomic Replacement Pattern**
   - Publishing follows Delete-then-Insert pattern
   - Chunks use Random UUID (not deterministic IDs)
   - `source_id` field connects chunks to source document

3. **API Contracts**
   - Endpoints match SAD §8 specifications
   - Request/response schemas match documented payloads
   - Headers `X-User-ID` and `X-User-Role` are used correctly

4. **Process Flows**
   - Ingestion creates session in Redis
   - Edit operations modify only Redis
   - Preview locks session
   - Publish performs atomic replacement in Qdrant

5. **Technology Compliance**
   - Uses specified stack (NestJS, Redis, Qdrant)
   - Module structure matches SAD §9.2

---

## Validation Report Format

After validation, report findings as:

```
## Validation Report: [Feature/Module Name]

### BRD Compliance
- [ ] Role/Mode enforcement: [PASS/FAIL] — [details]
- [ ] Primary flow support: [PASS/FAIL] — [details]
- [ ] MVP scope: [PASS/FAIL] — [details]
- [ ] Business rules: [PASS/FAIL] — [details]

### SAD Compliance
- [ ] Storage model: [PASS/FAIL] — [details]
- [ ] Atomic replacement: [PASS/FAIL] — [details]
- [ ] API contracts: [PASS/FAIL] — [details]
- [ ] Process flows: [PASS/FAIL] — [details]

### Issues Found
1. [Issue description + reference to BRD/SAD section]
2. ...

### Recommendations
1. [Suggested fix]
2. ...
```

---

## When to Validate

- After implementing a new feature
- Before marking a task as complete
- On explicit request from user
- During code review
