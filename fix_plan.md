# RAGler Documentation & Landing Page Fix Plan

## Pillar 1: World-Class Documentation

### Priority 1: Cleanup & Hygiene
- [x] **T1.1** Remove default Docusaurus boilerplate (tutorial-basics/, tutorial-extras/, markdown-page.md)
- [x] **T1.2** Remove unused default static assets (docusaurus.png, undraw_*.svg)
- [x] **T1.3** Fix hardcoded `/ragler/` base URL in index.tsx demo image — use `useBaseUrl` hook
- [x] **T1.4** Fix editUrl in docusaurus.config.ts (points to `ragler-oss` instead of `scrobot`)
- [x] **T1.5** Add `development/` section to navbar and create sidebar entry

### Priority 2: Missing Documentation Pages
- [x] **T2.1** Create `docs/product/file-upload.md` — file upload ingestion workflow (PDF, DOCX, TXT)
- [x] **T2.2** Create `docs/product/configurable-chunking.md` — LLM vs character chunking configuration
- [x] **T2.3** Create `docs/product/chat-playground.md` — RAG chat per collection
- [x] **T2.4** Create `docs/product/collection-agent.md` — AI agent for collection management
- [x] **T2.5** Create `docs/product/documents.md` — document lineage and browsing
- [x] **T2.6** Update `docs/product/ingestion.md` — add file upload reference, chunking config
- [x] **T2.7** Create `docs/changelog/versions/1.1.0.md` — collection editor & agent features
- [x] **T2.8** Create `docs/architecture/modules/settings.md` — settings module documentation

### Priority 3: Content Quality Improvements
- [x] **T3.1** Add Mermaid architecture diagram to `docs/architecture/overview.md`
- [x] **T3.2** Add Mermaid data flow diagram to `docs/product/flows/workflow.md`
- [x] **T3.3** Ensure all product pages have consistent sidebar_position frontmatter
- [ ] **T3.4** Add API reference section or improve endpoint documentation with request/response examples

## Pillar 2: Stunning Landing Page
- [ ] **T4.1** Redesign landing page hero section with animated gradient background
- [ ] **T4.2** Add architecture overview diagram section to landing page
- [ ] **T4.3** Add "How it Works" step-by-step section
- [ ] **T4.4** Add testimonials/stats section placeholder
- [ ] **T4.5** Improve footer with more links and branding

## Pillar 3: Demo Deployment
- [ ] **T5.1** Create `demo/docker-compose.yml` for all-in-one demo setup
- [ ] **T5.2** Create demo seed data script
- [ ] **T5.3** Create demo README with setup instructions
- [ ] **T5.4** Add health check validation script

---

## Progress Log

| Date | Task | Status | Notes |
|------|------|--------|-------|
| 2026-02-28 | T1.1–T1.5 | Done | Cleanup: removed boilerplate, fixed URLs, added development navbar |
| 2026-02-28 | T2.1–T2.8 | Done | Created 5 new product pages, 1 changelog, 1 architecture module doc |
| 2026-02-28 | T3.1–T3.3 | Done | Mermaid diagrams, sidebar positions, proper markdown links |
