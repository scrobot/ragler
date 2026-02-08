---
name: document-code
description: Generate comprehensive documentation for code files, modules, or the entire codebase, including README.md generation
userInvocable: true
---

# Document Code Skill

Generate clear, maintainable documentation for code — both inline docs and README files.

## Usage

```
/document-code [target]
```

Where `[target]` can be:

### Code Documentation
- A file path (e.g., `src/services/session.service.ts`)
- A directory (e.g., `src/services/`)
- `api` — document API endpoints
- `module <name>` — document a specific module
- `readme` — generate or update README.md for the project
- `readme <path>` — generate README.md for a specific package/directory

### Architecture Documentation
- `adr <topic>` — generate Architecture Decision Record
- `module-arch <name>` — generate module architecture doc (website/docs/architecture/modules/)
- `sync brd` — sync BRD to website/docs/product/
- `sync sad` — sync SAD to website/docs/architecture/

### Validation
- `check coverage` — scan for undocumented code
- `check drift` — detect stale documentation (code changed, docs didn't)
- `check links` — validate markdown links in website/docs/

### Interactive
- No argument — prompt for what to document

## Documentation Standards

### For Architecture Decision Records (ADRs)

ADRs capture important architectural decisions with context and rationale.

**Location:** `website/docs/architecture/adr/XXX-topic-name.md`

**Template:**
```markdown
---
title: ADR-XXX Topic Name
slug: /architecture/adr/XXX-topic-name
---

# ADR-XXX: Topic Name

**Status:** Accepted | Superseded | Deprecated
**Date:** YYYY-MM-DD
**Deciders:** Team | Role

## Context

What problem are we solving? What constraints exist?

## Decision

What did we decide to do?

## Rationale

Why this approach over alternatives?

## Consequences

### Positive
- What we gain from this decision

### Negative
- What we lose or trade off

### Neutral
- Other impacts to consider

## Alternatives Considered

What else did we evaluate and why was it rejected?

## References

- Links to relevant docs, specs, or discussions
- Related ADRs
```

**ADR Guidelines:**
- Keep ADRs immutable — supersede instead of editing
- Number ADRs sequentially (001, 002, 003...)
- Use descriptive slugs for clean URLs
- Link from product/architecture docs to relevant ADRs
- Update adr/index.md with summary

### For Module Architecture Docs

Module docs explain design decisions for backend modules.

**Location:** `website/docs/architecture/modules/<module-name>.md`

**Template:**
```markdown
---
title: Module Name
---

# Module: [Name]

## Purpose

What does this module do? What problem does it solve?

## Architecture

### Components
- List key classes, services, controllers

### Dependencies
- Internal: Other modules this depends on
- External: Third-party services (Redis, Qdrant, OpenAI)

### Integration Points
- How other modules use this module
- Exposed interfaces and APIs

## Key Concepts

### [Concept 1]
Explanation with code examples

### [Concept 2]
Explanation with code examples

## Data Model

Schemas, DTOs, interfaces, types used by this module

## Error Handling

Common errors, retry strategies, error propagation

## Configuration

Environment variables and their purpose

## Testing Strategy

How to test this module (unit, integration, e2e)

## Related Documentation

- Product docs that describe user-facing features
- ADRs that explain design decisions
- API docs for exposed endpoints
```

### For README.md Files

README files should follow this structure for optimal DX:

```markdown
# Project/Package Name

> One-line description of what this does

## Quick Start

Minimal steps to get running (copy-paste friendly):
- Installation command
- Basic usage example
- Expected output

## Features

- Feature 1 — brief explanation
- Feature 2 — brief explanation

## Installation

Detailed installation instructions including:
- Prerequisites
- Environment setup
- Dependency installation

## Usage

### Basic Usage
Code examples with explanations

### API Reference
For libraries: document exported functions/classes
For services: link to OpenAPI docs or list endpoints

### Configuration
Environment variables, config files, options

## Development

### Setup
How to set up local development environment

### Testing
How to run tests

### Building
Build commands and output locations

## Architecture (optional)
Brief overview of code structure for contributors

## Troubleshooting (optional)
Common issues and solutions

## License
```

**README Guidelines:**
- Lead with Quick Start — developers want to try before reading
- Include copy-paste-ready code blocks
- Show expected output where helpful
- Link to detailed docs rather than duplicating
- Keep it scannable with headers and bullet points
- Update when APIs or setup process changes

### For Functions/Methods
```typescript
/**
 * Brief description of what the function does.
 *
 * @param paramName - Description of parameter
 * @returns Description of return value
 * @throws {ErrorType} When this error occurs
 * @example
 * const result = functionName(param);
 */
```

### For Classes/Services
```typescript
/**
 * Brief description of the class purpose.
 *
 * @remarks
 * Additional context about usage, dependencies, or design decisions.
 *
 * @example
 * const service = new ServiceName(deps);
 * await service.method();
 */
```

### For API Endpoints
Use OpenAPI/Swagger decorators:
```typescript
@ApiOperation({ summary: 'Brief description' })
@ApiParam({ name: 'id', description: 'Resource identifier' })
@ApiResponse({ status: 200, description: 'Success response' })
@ApiResponse({ status: 400, description: 'Validation error' })
```

## Workflow

### For Architecture Decision Records (ADRs)
1. **Identify** the decision to document (from plan, SAD, or discussion)
2. **Extract** context, rationale, alternatives from source material
3. **Assign** sequential number (check existing ADRs in website/docs/architecture/adr/)
4. **Generate** ADR using template with appropriate slug
5. **Update** `website/docs/architecture/adr/index.md` with summary
6. **Cross-reference** from relevant product/architecture docs
7. **Present** draft for review before writing

### For Module Architecture Docs
1. **Analyze** the module code structure (backend/src/modules/<name>/)
2. **Read** existing README.md in module directory
3. **Extract** key concepts, patterns, dependencies from code
4. **Identify** design decisions (check for related ADRs)
5. **Document** data models, error handling, config
6. **Generate** architecture doc using template
7. **Cross-reference** from architecture/overview.md and related docs
8. **Present** draft for review before writing

### For Documentation Sync (BRD/SAD → Website)
1. **Read** source document (docs/brd.md or docs/sad.md)
2. **Map** sections to target website docs:
   - BRD → website/docs/product/
   - SAD → website/docs/architecture/
3. **Compare** existing website docs with source
4. **Identify** changes, additions, or gaps
5. **Generate** updates maintaining user-friendly language
6. **Add** examples, diagrams, code snippets (not in BRD/SAD)
7. **Preserve** bidirectional links between docs
8. **Present** sync plan before applying changes

**BRD → Product Docs Mapping:**
- Product Goals & Scope → product/intro.md
- User Roles → product/roles.md
- Modes of Operation → product/flows/*.md
- Collections → product/collections.md
- Data Sources → product/ingestion.md
- Functional Requirements → product/sessions.md, product/publishing.md
- User Flows → product/flows/*.md (with Mermaid diagrams)

**SAD → Architecture Docs Mapping:**
- Executive Summary → architecture/overview.md
- ADRs → architecture/adr/XXX-*.md (individual files)
- Functional Architecture → architecture/modules/*.md
- Data Architecture → architecture/data-model.md
- Technology Stack → architecture/system-design.md
- MCP Integration → architecture/mcp-server.md (comprehensive doc)

### For Documentation Validation

**Coverage Check:**
1. **Scan** backend/src/modules/ for exported functions/classes using Glob
2. **Check** for JSDoc comments on public APIs using Grep
3. **Verify** each module has README.md
4. **Check** API endpoints have OpenAPI decorators
5. **Report** undocumented items with file:line references
6. **Suggest** priority order (controllers > services > utilities)

**Drift Detection:**
1. **Compare** git history of code vs docs using Bash (git log)
2. **Identify** files modified without doc updates
3. **Check** if module code changed but architecture doc unchanged
4. **Check** if API changed but OpenAPI unchanged
5. **Report** files with potential drift
6. **Suggest** which docs need review

**Link Validation:**
1. **Crawl** website/docs/ for markdown files using Glob
2. **Extract** all internal links using Grep (relative paths, /docs/ paths)
3. **Verify** link targets exist using Read
4. **Check** external links (HTTP HEAD requests using Bash with curl)
5. **Report** broken links with source file:line
6. **Distinguish** between internal (fixable) and external (informational)

### For Code Documentation
1. **Analyze** the target code structure
2. **Identify** public interfaces, exported functions, classes
3. **Generate** JSDoc/TSDoc comments following project conventions
4. **Add** OpenAPI decorators for API endpoints
5. **Verify** documentation compiles without errors
6. **Present** changes for review

### For README Generation
1. **Scan** the target directory for:
   - `package.json` (name, description, scripts, dependencies)
   - Entry points (`src/main.ts`, `index.ts`, etc.)
   - Config files (`.env.example`, `tsconfig.json`, etc.)
   - Existing documentation
   - Test files (to document testing approach)
2. **Analyze** the codebase to understand:
   - What the project/package does
   - Key exports and APIs
   - Required setup steps
   - Available commands
3. **Check** for existing README.md:
   - If exists: propose updates/enhancements
   - If missing: generate from template
4. **Generate** README content following the structure above
5. **Present** draft for review before writing

## Rules

### Code Documentation
- Document PUBLIC interfaces only (skip private/internal unless complex)
- Keep descriptions concise but complete
- Include examples for non-obvious usage
- Document error conditions and edge cases
- Match existing documentation style in the codebase
- Never remove existing documentation — only enhance
- Do NOT document trivial getters/setters unless they have side effects

### README Files
- README must be accurate — verify commands actually work
- Extract real values from `package.json` scripts
- Include actual environment variables from `.env.example`
- Don't document features that don't exist
- Keep Quick Start under 5 steps
- Code examples must be syntactically correct and runnable
- Update README when code changes affect setup or usage
- For monorepos: each package should have its own README

## Output

### For Code Documentation
1. Show summary of documented items
2. Present diff for review
3. Wait for user approval before applying

### For README Generation
1. Show analysis summary (what was discovered about the project)
2. Present full README draft in a code block
3. Highlight any sections that need manual input (e.g., architecture decisions)
4. Wait for user approval before writing the file

## Examples

### Generate project README
```
/document-code readme
```
Generates README.md at repository root.

### Generate package README
```
/document-code readme packages/core
```
Generates README.md for a specific package.

### Document and create README
```
/document-code src/services/
/document-code readme
```
First adds inline docs, then generates README referencing the documented APIs.

### Generate Architecture Decision Record
```
/document-code adr atomic-replacement
```
Creates website/docs/architecture/adr/002-atomic-replacement.md using the ADR template.

### Document module architecture
```
/document-code module-arch session
```
Generates website/docs/architecture/modules/session.md documenting the session module's design.

### Sync specifications to website
```
/document-code sync brd
/document-code sync sad
```
Updates website/docs/product/ and website/docs/architecture/ from canonical specs.

### Validate documentation
```
/document-code check coverage
/document-code check drift
/document-code check links
```
Scans for undocumented code, stale docs, and broken links.
