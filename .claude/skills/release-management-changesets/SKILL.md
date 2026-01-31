---
name: release-management-changesets
description: Enforces release management via Changesets for Node.js/TypeScript projects
---

This repo uses **Changesets** as the mandatory release management mechanism.

No feature, fix, or breaking change is considered complete unless it includes an appropriate changeset.

---

## 1) When a changeset is REQUIRED
Create a changeset for any PR that:
- changes runtime behavior
- changes public API (backend API contract OR exported package API)
- fixes a bug
- adds a feature
- changes config/behavior that impacts users
- modifies performance characteristics or operational behavior

No changeset needed ONLY for:
- internal refactors with zero observable behavior change
- formatting, comments, docs-only changes (unless docs are published as a package)
- purely test-only changes

If unsure → create a changeset.

---

## 2) Correct semver classification
- **patch**: bugfix, internal improvement with user-visible benefit but no API changes
- **minor**: backward-compatible feature addition
- **major**: breaking changes (API changes, behavior changes requiring user action)

If a change may break existing consumers → treat as major.

---

## 3) Changeset content requirements
A changeset MUST:
- mention affected package(s)
- clearly describe user impact
- include operational notes if relevant (env vars, migrations, behavior changes)
- avoid implementation details; focus on what changed and why it matters

Guideline style:
- one short headline line
- 2–6 bullet points
- include “BREAKING:” section if major

---

## 4) Standard workflow
Before starting work:
- ensure changesets are initialized:
  - `pnpm changeset init` (once per repo)

During PR:
1) Implement the change
2) Add/Update tests
3) Run:
   - typecheck + lint
   - unit/integration tests
4) Create changeset:
   - `pnpm changeset`
5) Ensure changeset matches semver impact
6) Commit changeset along with code

Never split the changeset into a separate follow-up PR unless explicitly requested.

---

## 5) Release workflow (when asked)
When preparing a release:
1) `pnpm changeset version`
   - updates package versions
   - generates/updates changelog
2) run full CI locally if required
3) commit version bumps + changelog
4) publish:
   - `pnpm changeset publish` (or CI pipeline)

If monorepo:
- ensure correct package selection
- avoid unintended bumps
- verify dependency graph versioning

---

## 6) Integration with production readiness
If a change affects production behavior:
- changeset MUST include:
  - new env vars
  - config changes
  - backward compatibility notes
  - rollout / risk notes (if relevant)

---

## 7) Definition of Done (DoD)
A PR is NOT done unless:
- code is merged with appropriate changeset (when required)
- tests pass
- changelog impact is clear