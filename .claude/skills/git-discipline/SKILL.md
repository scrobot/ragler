---
name: git-discipline-atomic-commits
description: Enforces atomic commits, clean history, and commit-after-step workflow
---

This project requires strict Git discipline.

Goal:
- small, reviewable diffs
- one logical change per commit
- green tests before commit
- no "WIP" commits unless explicitly requested

---

## 1) Atomicity rule
A commit must represent exactly ONE of:
- a single feature slice
- a single bugfix
- a single refactor with no behavior change
- a single test improvement
- a single build/config adjustment

If changes span multiple concerns:
- split into multiple commits

---

## 2) Workflow for every task
For each task, you MUST:
1) create or confirm a feature branch (unless told otherwise)
2) implement the smallest coherent step
3) add/update tests for the step
4) run relevant checks locally:
   - typecheck + lint (if configured)
   - unit tests
   - integration tests if the change touches flows
5) only if green: stage changes and commit

Never propose a commit while tests are failing, unless explicitly asked to checkpoint.

---

## 3) Commit message standard
Use Conventional Commits:
- feat(scope): ...
- fix(scope): ...
- refactor(scope): ...
- test(scope): ...
- chore(scope): ...

Scope should be meaningful (api, sessions, qdrant, ingest, ui).

Commit message must describe user-visible intent, not implementation detail.

---

## 4) "Commit after each step" interpretation
"After each change" means:
- after each **completed micro-deliverable** (with tests)
NOT after each file edit.

A micro-deliverable is:
- a working endpoint with validation
- a working redis session transition
- a working qdrant publish operation
- a working UI screen/flow slice
- a completed test suite addition

---

## 5) Clean working tree discipline
- do not leave uncommitted changes between steps
- if exploratory edits are needed:
  - use a separate commit: chore(wip): checkpoint (only if asked)
  - or revert unused changes

---

## 6) PR readiness
Before proposing a PR:
- ensure commits are logically ordered
- ensure each commit is green
- ensure changesets exist when required (see release-management-changesets)

---

## 7) Safety
Never commit:
- secrets
- credentials
- API keys
- tokens

If such data is detected:
- remove it and rotate if needed
- then commit the fix