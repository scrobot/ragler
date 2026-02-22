# ADR 007: Configurable Chunking Strategy

## Context

LLM-based semantic chunking produces high-quality boundaries but is slow and costly. Power users need control over chunk size and overlap for specific use cases.

## Decision

Offer two chunking methods via an optional `chunkingConfig` field in ingest DTOs:

- **`llm`** (default): Existing `StructuredChunker` with GPT-powered section analysis.
- **`character`**: `chunkByCharacter()` — splits by character count with paragraph/sentence boundary detection and configurable overlap.

Default to LLM chunking when no config is provided.

## Consequences

- Users can choose speed over quality when appropriate.
- Character chunker has no LLM cost and processes instantly.
- More configuration surface, but sensible defaults mitigate complexity.

## Alternatives considered

- Token-based chunking — requires a tokenizer dependency.
- Sentence-only chunking — too granular for most use cases.
