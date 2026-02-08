---
title: LLM Module
sidebar_position: 4
---

# Module: LLM

## Purpose

The **LLM module** provides OpenAI integration for chunking, enrichment, and embedding generation using the **Two-LLM Pattern**: GPT-4o for chunking (precision) and GPT-4o-mini for enrichment (cost-efficiency).

## Architecture

### Components

**Key Classes:**
- `LlmService` - Core service for all LLM operations
- **Chunkers:**
  - `StructuredChunker` - Markdown-aware semantic chunking (GPT-4o)
- **Parsers:**
  - `DocumentParser` - Document structure analysis (headings, lists, code blocks)
  - `MarkdownParser` - Markdown-specific parsing
- **Classifiers:**
  - `NavigationIntentClassifier` - User intent classification
- **Extractors:**
  - `TagExtractor` - Automatic tag extraction from content
- **Utils:**
  - `TextNormalizer` - Text preprocessing
  - `TokenCounter` - Token estimation for cost control

**Design Pattern:**
- **Strategy Pattern** - Different chunking strategies (structured, semantic, fixed-size)
- **Factory Pattern** - Parser selection based on content type
- **Two-LLM Pattern** - Separate models for different use cases

### Dependencies

**Internal:**
- None (leaf module - no internal dependencies)

**External:**
- **OpenAI API** - GPT-4o, GPT-4o-mini, text-embedding-3-small
  - Chunking: `gpt-4o` with strict JSON mode
  - Enrichment: `gpt-4o-mini` for scenarios
  - Embeddings: `text-embedding-3-small` (1536 dimensions)

### Integration Points

**Used By:**
- `IngestModule` - Initial chunking after content fetch
- `SessionModule` - LLM-assisted refinement (scenarios)
- `VectorModule` - Embedding generation for Qdrant

**Exposes:**
- `chunkContent(content, options)` - Split content into semantic chunks
- `refineChunk(chunk, scenario, instructions)` - LLM-assisted enrichment
- `generateEmbedding(text)` - Create vector embedding
- `extractTags(content)` - Auto-generate tags
- `classifyIntent(query)` - Classify user intent

## Key Concepts

### Two-LLM Pattern

**Architecture Decision:** Use different models for different tasks to optimize quality vs cost.

```mermaid
graph LR
    Content[Source Content] --> Architect[GPT-4o Architect]
    Architect --> Chunks[Semantic Chunks]
    Chunks --> Assistant[GPT-4o-mini Assistant]
    Assistant --> Enriched[Enriched Chunks]
    Enriched --> Embedder[text-embedding-3-small]
    Embedder --> Vectors[Vector Embeddings]
```

**1. Architect (GPT-4o):**
- **Purpose:** Initial content chunking
- **Why GPT-4o:** Requires deep understanding of semantic structure
- **Output:** Strict JSON with chunk boundaries
- **Cost:** ~$2-5 per 1000 documents
- **Latency:** ~5-10 seconds per document

**2. Assistant (GPT-4o-mini):**
- **Purpose:** Chunk enrichment (simplify, clarify, add examples)
- **Why GPT-4o-mini:** Simple text transformations, cost-sensitive
- **Output:** Markdown text
- **Cost:** ~$0.15 per 1000 enrichments
- **Latency:** ~1-2 seconds per chunk

**3. Embedder (text-embedding-3-small):**
- **Purpose:** Generate vector embeddings for search
- **Why text-embedding-3-small:** Cost-effective, 1536 dimensions
- **Output:** Float array [1536]
- **Cost:** ~$0.02 per 1000 chunks
- **Latency:** ~0.5 seconds per batch (up to 2048 chunks)

**Cost Analysis:**
| Operation | Model | Cost per 1K ops | Use Case |
|-----------|-------|-----------------|----------|
| Chunking | GPT-4o | $2-5 | Initial ingestion |
| Enrichment | GPT-4o-mini | $0.15 | User-triggered refinement |
| Embedding | text-embedding-3-small | $0.02 | Every publish |

**Total Cost Example (1000 documents):**
- Chunking: $2-5 (one-time)
- Enrichment: $0.15 × 20% = $0.03 (assuming 20% chunks refined)
- Embedding: $0.02 × 8 chunks/doc = $0.16
- **Total:** ~$2.19-$5.19 per 1000 documents

### Chunking Strategy

#### Structured Chunking (Default)

**Algorithm:** Markdown-aware semantic segmentation

**Process:**
1. **Parse Document Structure:**
   - Extract headings (H1-H6)
   - Identify code blocks
   - Detect lists and tables
   - Find section boundaries

2. **Semantic Segmentation (GPT-4o):**
   - Prompt LLM to identify natural breakpoints
   - Preserve heading context
   - Keep code blocks intact
   - Maintain semantic coherence

3. **Size Optimization:**
   - Target: 200-500 tokens per chunk
   - Min: 100 tokens (avoid tiny chunks)
   - Max: 800 tokens (avoid large chunks)

4. **Context Preservation:**
   - Add heading breadcrumbs (e.g., "Introduction > Getting Started")
   - Preserve code language tags
   - Maintain list structure

**Prompt Template:**
```
You are a semantic chunking expert. Split the following document into semantic chunks.

Requirements:
1. Each chunk should be a complete, self-contained unit of meaning
2. Preserve heading structure and context
3. Keep code blocks intact
4. Target 200-500 tokens per chunk
5. Include heading breadcrumbs for context

Document:
{document_content}

Return JSON:
{
  "chunks": [
    {
      "content": "...",
      "heading": "Introduction > Getting Started",
      "type": "text|code|list|table",
      "order": 0
    }
  ]
}
```

**Output Format (Strict JSON):**
```json
{
  "chunks": [
    {
      "content": "RAGler is a knowledge management system...",
      "heading": "Introduction",
      "type": "text",
      "order": 0,
      "token_count": 250
    },
    {
      "content": "```typescript\nconst session = await createSession(...);\n```",
      "heading": "Getting Started > Installation",
      "type": "code",
      "order": 1,
      "token_count": 150
    }
  ]
}
```

### Enrichment Scenarios

**Purpose:** LLM-assisted chunk improvement triggered by users

**Available Scenarios:**

| Scenario | Model | Purpose | Example Prompt |
|----------|-------|---------|----------------|
| `simplify` | GPT-4o-mini | Remove jargon, shorten | "Simplify this text for non-technical users" |
| `clarify` | GPT-4o-mini | Add context, explain acronyms | "Clarify technical terms and add definitions" |
| `add_examples` | GPT-4o-mini | Generate code examples | "Add a practical example of how to use this API" |
| `restructure` | GPT-4o-mini | Improve flow | "Improve sentence structure and transitions" |
| `generate_summary` | GPT-4o-mini | Create TL;DR | "Summarize this content in 2-3 sentences" |
| `extract_keywords` | GPT-4o-mini | Auto-tagging | "Extract 3-5 key concepts from this text" |

**API Flow:**
```http
POST /sessions/:id/refine
Content-Type: application/json

{
  "chunkId": "chunk_7",
  "scenario": "add_examples",
  "instructions": "Add curl example for this API endpoint"
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "type": "content_update",
      "original": "Use POST /api/ingest to create a session.",
      "suggested": "Use POST /api/ingest to create a session. Example:\n```bash\ncurl -X POST http://localhost:3000/api/ingest \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"sourceType\": \"manual\", \"content\": \"...\"}'```"
    }
  ],
  "autoApply": false
}
```

**IMPORTANT:** Suggestions are never auto-applied. User must approve.

### Embedding Generation

**Model:** `text-embedding-3-small` (1536 dimensions)

**Process:**
1. **Normalize Text:**
   - Remove excessive whitespace
   - Normalize newlines
   - Trim to max length (8191 tokens for text-embedding-3-small)

2. **Batch Embeddings:**
   - Group up to 2048 chunks per request
   - Parallel processing for large sessions

3. **Generate Embeddings:**
   - Call OpenAI API
   - Receive float array [1536]
   - Store in Qdrant with chunk payload

**API Call:**
```typescript
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: chunksContent, // Array of strings
  dimensions: 1536
});

const embeddings = response.data.map(item => item.embedding);
```

**Error Handling:**
- Rate limit → Retry with exponential backoff
- Token limit exceeded → Truncate text to 8000 tokens
- API failure → Return error, do not publish

## Data Model

### Chunking Request DTO

```typescript
interface ChunkingRequestDto {
  content: string;              // Source content (max 30,000 chars)
  sourceType: 'confluence' | 'web' | 'manual';
  options?: {
    strategy?: 'structured' | 'semantic' | 'fixed';
    targetSize?: number;        // Target tokens per chunk
    maxSize?: number;           // Max tokens per chunk
    preserveCodeBlocks?: boolean;
    addBreadcrumbs?: boolean;
  };
}
```

### Chunking Response DTO

```typescript
interface ChunkingResponseDto {
  chunks: Chunk[];
  metadata: {
    totalChunks: number;
    totalTokens: number;
    averageTokensPerChunk: number;
    strategy: string;
    model: string;
    costEstimate: number;       // USD
  };
}

interface Chunk {
  id: string;
  content: string;
  order: number;
  heading?: string;
  type: 'text' | 'code' | 'list' | 'table';
  tokenCount: number;
  metadata?: Record<string, any>;
}
```

### Refinement Request DTO

```typescript
interface RefineChunkDto {
  chunkId: string;
  scenario: 'simplify' | 'clarify' | 'add_examples' | 'restructure' | 'generate_summary' | 'extract_keywords';
  instructions?: string;        // Optional user instructions
  context?: {
    adjacentChunks?: string[];  // Surrounding chunks for context
    documentTitle?: string;
  };
}
```

### Refinement Response DTO

```typescript
interface RefineResponseDto {
  suggestions: Suggestion[];
  autoApply: false;             // Always false (user must approve)
  metadata: {
    model: string;
    tokensUsed: number;
    costEstimate: number;
    latency: number;            // milliseconds
  };
}

interface Suggestion {
  type: 'content_update' | 'metadata_update' | 'tag_addition';
  original: string;
  suggested: string;
  confidence: number;           // 0-1
  rationale?: string;
}
```

## Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `LLM_TIMEOUT` | OpenAI API timeout | Retry with exponential backoff (max 3 retries) |
| `LLM_RATE_LIMIT` | Rate limit exceeded | Wait 60 seconds, retry |
| `LLM_TOKEN_LIMIT_EXCEEDED` | Content too large | Truncate content to 30,000 chars |
| `LLM_INVALID_JSON` | GPT-4o returned malformed JSON | Retry with stricter prompt |
| `LLM_API_KEY_INVALID` | Missing or invalid API key | Check `OPENAI_API_KEY` env var |
| `EMBEDDING_GENERATION_FAILED` | Embedding API failure | Retry, fallback to default embedding |
| `INSUFFICIENT_BALANCE` | OpenAI account balance depleted | Top up OpenAI account |

### Retry Strategy

**Transient Failures (Retryable):**
- Timeouts → 3 retries with exponential backoff (1s, 2s, 4s)
- Rate limits → Wait 60s, retry
- Network errors → Retry immediately (circuit breaker)

**Non-Retryable Failures:**
- Invalid API key → User must fix configuration
- Token limit exceeded → User must reduce content size
- Malformed JSON (after 3 retries) → Return error to user

### Error Propagation

All LLM errors include:
```json
{
  "statusCode": 500,
  "message": "LLM chunking failed after 3 retries",
  "error": "LLM_TIMEOUT",
  "context": {
    "model": "gpt-4o",
    "tokensUsed": 5000,
    "retries": 3,
    "lastError": "Request timeout after 30000ms"
  }
}
```

## Configuration

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `OPENAI_API_KEY` | OpenAI authentication | *(required)* |
| `LLM_CHUNKING_MODEL` | Model for chunking | `gpt-4o` |
| `LLM_ENRICHMENT_MODEL` | Model for enrichment | `gpt-4o-mini` |
| `LLM_EMBEDDING_MODEL` | Model for embeddings | `text-embedding-3-small` |
| `LLM_CHUNKING_TIMEOUT` | Chunking timeout (ms) | `120000` (2 min) |
| `LLM_ENRICHMENT_TIMEOUT` | Enrichment timeout (ms) | `60000` (1 min) |
| `LLM_EMBEDDING_TIMEOUT` | Embedding timeout (ms) | `30000` (30 sec) |
| `LLM_CHUNKING_MAX_CONTENT_LENGTH` | Max content size (chars) | `30000` |
| `LLM_CHUNKING_MAX_RETRIES` | Retry attempts | `3` |
| `LLM_TARGET_CHUNK_SIZE` | Target tokens per chunk | `350` |
| `LLM_MAX_CHUNK_SIZE` | Max tokens per chunk | `800` |

### Cost Controls

**Daily Limits (Recommended):**
```bash
LLM_DAILY_BUDGET_USD=50          # Max spend per day
LLM_WARN_THRESHOLD_USD=40        # Warning threshold
```

**Token Limits:**
```bash
LLM_MAX_TOKENS_PER_REQUEST=8000  # Max tokens per chunking request
LLM_MAX_EMBEDDING_BATCH=2048     # Max chunks per embedding batch
```

## Testing Strategy

### Unit Tests

**Location:** `test/unit/llm/llm.service.spec.ts`

**Coverage:**
- Chunking with different strategies
- Enrichment scenarios
- Embedding generation
- Error handling and retries
- Cost estimation
- Token counting

**Key Test Cases:**
```typescript
describe('LlmService', () => {
  describe('Chunking', () => {
    it('should chunk markdown content with structured strategy');
    it('should preserve code blocks intact');
    it('should add heading breadcrumbs');
    it('should respect target chunk size');
    it('should retry on timeout (max 3 times)');
    it('should return error after max retries');
  });

  describe('Enrichment', () => {
    it('should simplify technical text');
    it('should add examples to API documentation');
    it('should extract keywords from content');
    it('should return suggestions (not auto-apply)');
  });

  describe('Embeddings', () => {
    it('should generate embedding for single chunk');
    it('should batch embeddings for multiple chunks');
    it('should handle rate limit errors');
  });
});
```

### Integration Tests

**Location:** `test/app.e2e-spec.ts`

**Coverage:**
- Full ingestion flow with LLM chunking
- Enrichment + embedding pipeline
- Cost tracking
- OpenAI API integration

**Key Test Cases:**
```typescript
describe('LLM E2E', () => {
  it('should chunk Confluence page and generate embeddings');
  it('should enrich chunk and create suggestions');
  it('should handle OpenAI rate limits gracefully');
  it('should track costs accurately');
});
```

## Related Documentation

- [Product: Data Ingestion](/docs/product/ingestion) - User-facing chunking workflow
- [Architecture: Session Module](/docs/architecture/modules/session) - Draft editing
- [Architecture: Vector Module](/docs/architecture/modules/vector) - Embedding storage
- [ADR-003: Two-LLM Pattern](/docs/architecture/adr/003-two-llms) - Design decision rationale
- [Product: Advanced Mode Workflow](/docs/product/flows/advanced-mode) - Enrichment scenarios
