# Landing Page Specification

## Goal
A premium, modern landing page for RAGler's Docusaurus documentation site that showcases the platform's capabilities and drives adoption.

## Framework
- Use Docusaurus custom pages (`docs/src/pages/index.tsx`)
- CSS in `docs/src/css/custom.css` and component-level styles
- React components in `docs/src/components/`

## Design System
- **Color palette:** Zinc-based neutral tones matching the frontend app
  - Primary: `#18181b` (zinc-950), `#27272a` (zinc-800)
  - Accents: Violet/purple gradients for CTAs
  - Text: `#fafafa` (zinc-50) on dark, `#09090b` on light
- **Typography:** Inter (Google Fonts), already used in frontend
- **Theme:** Dark-first, with light mode support
- **Effects:** Glassmorphism cards, subtle gradients, micro-animations

## Required Sections

### 1. Hero Section
- Large tagline: "The Human-in-the-Loop RAG Platform"
- Subtitle: Explain RAGler in one sentence
- Two CTAs: "Get Started" → docs, "Try Demo" → demo link
- Animated background (subtle gradient mesh or particles)

### 2. Feature Grid (3-column on desktop, 1 on mobile)
Features to highlight:
1. **Multi-Source Ingest** — Confluence, web pages, file upload, manual text
2. **Human-in-the-Loop** — Review, edit, approve every chunk before publishing
3. **Smart Chunking** — LLM-powered chunking with automatic cleaning
4. **Draft Sessions** — Safe editing sandbox in Redis before publishing
5. **Collection Management** — Organize knowledge into searchable collections
6. **MCP Integration** — Query knowledge from Claude Desktop via MCP server

### 3. How It Works (Step-by-step visual)
1. Ingest → 2. Review & Edit → 3. Publish → 4. Query
Visual flow diagram or animated steps

### 4. Architecture Overview
Mermaid or SVG diagram showing:
```
[Sources] → [Ingest API] → [LLM Chunking] → [Redis Draft] → [Human Review] → [Qdrant Published] → [Query API / MCP]
```

### 5. Quick Start Code Block
```bash
git clone https://github.com/scrobot/ragler
docker compose up -d
cd backend && pnpm install && pnpm start:dev
```
Styled code block with copy button

### 6. Demo CTA
"Try RAGler in 2 minutes" with docker compose demo command

### 7. Footer
Links to: Documentation, GitHub, License

## Responsive Breakpoints
- Mobile: < 768px (single column, simplified)
- Tablet: 768-1024px (two columns)
- Desktop: > 1024px (full layout)

## Performance Requirements
- Lighthouse score > 90 on all metrics
- No external JS dependencies beyond Docusaurus
- Lazy-load animations below the fold
