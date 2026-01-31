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
- A file path (e.g., `src/services/session.service.ts`)
- A directory (e.g., `src/services/`)
- `api` — document API endpoints
- `module <name>` — document a specific module
- `readme` — generate or update README.md for the project
- `readme <path>` — generate README.md for a specific package/directory
- No argument — prompt for what to document

## Documentation Standards

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
