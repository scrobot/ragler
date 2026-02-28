# Ralph Fix Plan — RAGler Documentation, Landing Page & Demo

## 🔴 Phase 1: Documentation Foundation (HIGH PRIORITY)

### 1.1 Audit & Understand
- [ ] Read all existing docs in `docs/docs/` and understand current coverage
- [ ] Read `specs/brd.md`, `specs/sad.md`, and `specs/ftr/` for feature specs
- [ ] Read `CLAUDE.md` for engineering guidelines
- [ ] Run backend, explore Swagger at `/api/docs`, document all endpoints
- [ ] Run frontend, take note of all screens and user flows

### 1.2 Improve README.md
- [ ] Rewrite root `README.md` with compelling project description
- [ ] Add badges (build status, license, docs link, demo link)
- [ ] Add screenshots/GIFs of the UI
- [ ] Add feature highlights with icons/emoji
- [ ] Add contribution guide link
- [ ] Add architecture diagram (Mermaid)
- [ ] Ensure quick start is copy-paste friendly

### 1.3 Getting Started Docs
- [ ] Rewrite `docs/docs/getting-started/installation.md` — step by step, verified
- [ ] Update `docs/docs/getting-started/first-collection.md` — real examples
- [ ] Add "5-Minute Quick Start" tutorial with screenshots
- [ ] Add troubleshooting section with common errors

### 1.4 Product Docs
- [ ] Document all ingest sources (Confluence, Web, Manual, File upload)
- [ ] Document session lifecycle (create → review → preview → publish)
- [ ] Document collection management (CRUD, chunk browsing)
- [ ] Document query/search functionality
- [ ] Add flow diagrams for each user journey

### 1.5 Architecture Docs
- [ ] Update `docs/docs/architecture/overview.md` with current state
- [ ] Add data flow diagrams (ingest → chunk → embed → publish)
- [ ] Document storage model (Redis drafts vs Qdrant published)
- [ ] Document API design patterns
- [ ] Add MCP server documentation

### 1.6 API Reference
- [ ] Generate comprehensive API reference from Swagger/OpenAPI spec
- [ ] Add request/response examples for every endpoint
- [ ] Document authentication (X-User-ID header)
- [ ] Document error response format

---

## 🟡 Phase 2: Landing Page (MEDIUM-HIGH PRIORITY)

### 2.1 Design & Plan
- [ ] Study existing `docs/src/pages/index.tsx` and `docs/src/css/custom.css`
- [ ] Plan landing page sections: Hero, Features, How It Works, Architecture, Quick Start, Demo CTA
- [ ] Define color scheme consistent with frontend app (zinc palette, dark-first)

### 2.2 Build Landing Page
- [ ] Create hero section with tagline, description, and CTA buttons
- [ ] Create features grid (6-8 key features with icons)
- [ ] Create "How It Works" section with step-by-step visual flow
- [ ] Create architecture diagram section (interactive or animated)
- [ ] Create quick start code snippet section
- [ ] Create "Try the Demo" CTA section
- [ ] Add social proof / stats section (if applicable)
- [ ] Add footer with links to docs, GitHub, etc.

### 2.3 Polish Landing Page
- [ ] Add micro-animations and hover effects
- [ ] Ensure responsive design (mobile, tablet, desktop)
- [ ] Add dark/light mode support matching Docusaurus theme
- [ ] Optimize images and assets
- [ ] Test cross-browser compatibility

---

## 🟢 Phase 3: Demo Deployment (MEDIUM PRIORITY)

### 3.1 Docker Compose All-in-One
- [ ] Create `docker-compose.demo.yml` with all services (backend, frontend, qdrant, redis)
- [ ] Write `Dockerfile` for backend (NestJS)
- [ ] Write `Dockerfile` for frontend (Next.js)
- [ ] Configure proper networking between services
- [ ] Add health check configurations

### 3.2 Demo Seed Data
- [ ] Create seed script that populates demo collections
- [ ] Prepare sample knowledge base content (3-5 document sources)
- [ ] Pre-create example chunks showing different ingest types
- [ ] Add seed data for demonstrating search/query

### 3.3 Demo Configuration
- [ ] Create `.env.demo` with safe defaults (no real API keys needed for browse)
- [ ] Configure session TTL for short-lived demo (e.g. 1 hour)
- [ ] Add demo mode flag to backend that disables destructive operations
- [ ] Create demo welcome screen / guided tour overlay

### 3.4 Demo Documentation
- [ ] Write `DEMO.md` with one-click setup instructions
- [ ] Document demo limitations and scope
- [ ] Add "Deploy Your Own Demo" section with cloud options
- [ ] Create demo walkthrough guide

### 3.5 CI/CD for Demo
- [ ] Add GitHub Action for building demo Docker images
- [ ] Add `make demo` or `pnpm demo` convenience command
- [ ] Add health check validation script

---

## ✅ Completed
- [x] Project enabled for Ralph
- [x] Ralph configuration files created

---

## Notes
- Execute tasks in phase order (1 → 2 → 3)
- Within each phase, work top-to-bottom by sub-section
- Quality > quantity — one excellent doc page beats five mediocre ones
- Always verify against actual running code before documenting
- Commit after each meaningful sub-task completion
- Update this file after each loop
