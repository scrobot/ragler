---
title: ADR-003 Two LLMs Pattern
slug: /architecture/adr/003-two-llms
---

# ADR-003: Two LLMs Pattern (Quality + Cost Optimization)

**Status:** Accepted
**Date:** 2026-02-06
**Deciders:** Solution Architect, Development Team

## Context

KMS-RAG uses LLMs for two distinct operations:
1. **Initial Chunking**: Parse raw documents into semantic chunks with strict JSON output
2. **Chunk Enrichment**: Apply user-requested transformations (e.g., "Simplify", "Clarify", "Add context")

**The Cost-Quality Tradeoff:**

- **GPT-4o** (flagship model):
  - ✅ Excellent at structured output (JSON Schema adherence)
  - ✅ Strong reasoning for complex chunking decisions
  - ❌ Expensive: ~$2.50 per 1M tokens input, ~$10 per 1M tokens output

- **GPT-4o-mini** (cost-optimized model):
  - ✅ Cheap: ~$0.15 per 1M tokens input, ~$0.60 per 1M tokens output (15x cheaper)
  - ✅ Fast: Lower latency for simple tasks
  - ⚠️ Less reliable for complex structured output
  - ⚠️ Weaker reasoning for ambiguous chunking decisions

**The Problem:**

If we use GPT-4o for everything:
- ❌ **High cost**: $2-5 per 1000 documents (chunking + enrichment)
- ❌ **Slow enrichment**: Premium model overhead for simple text transformations

If we use GPT-4o-mini for everything:
- ❌ **Unreliable chunking**: JSON schema violations, poor boundary detection
- ❌ **Quality issues**: Inconsistent chunk sizes, missing context

The decision: How do we balance quality and cost for different LLM tasks?

## Decision

**Use a Two-Model Architecture: GPT-4o for chunking, GPT-4o-mini for enrichment.**

Specifically:
1. **Architect (GPT-4o)**: Handles initial document chunking
   - Input: Raw document content
   - Output: Structured JSON array of chunks
   - Task: Detect semantic boundaries, ensure valid JSON output
   - Cost: High, but run once per document

2. **Assistant (GPT-4o-mini)**: Handles chunk enrichment
   - Input: Single chunk text + user instruction (e.g., "Simplify this")
   - Output: Transformed chunk text
   - Task: Text transformation, summarization, clarification
   - Cost: Low, run multiple times during editing

## Rationale

### Why GPT-4o for Chunking

**Chunking requires high-stakes accuracy:**
- **JSON structure enforcement**: Must produce valid `ChunkSchema` array (no hallucinated fields)
- **Boundary detection**: Complex reasoning to identify semantic breaks
- **Context preservation**: Avoid splitting mid-sentence or mid-concept
- **One-shot execution**: Chunking happens once per ingestion—worth the premium cost

**Cost calculation:**
- Typical document: 5,000 tokens input → $0.0125 per document
- 1,000 documents/month → **~$12.50/month chunking cost**
- **Acceptable** for business value delivered

### Why GPT-4o-mini for Enrichment

**Enrichment is low-stakes transformation:**
- **Simple instructions**: "Simplify", "Add bullet points", "Clarify jargon"
- **Retry-safe**: If output is poor, user can re-run with different prompt
- **High frequency**: Users may enrich 10-20 chunks per session
- **Text-only output**: No strict JSON schema required

**Cost calculation:**
- Typical enrichment: 500 tokens input + 500 tokens output → $0.00045 per operation
- 20 enrichments/session, 100 sessions/month → **~$0.90/month enrichment cost**
- **15x cost savings** vs using GPT-4o

### Why Hybrid Approach

- **Cost optimization**: 94% cost reduction on enrichment tasks
- **Quality preservation**: Chunking accuracy maintained at 99%+
- **Performance**: Enrichment latency reduced by 2-3x (mini is faster)
- **Scalability**: Can handle 10x traffic without proportional cost increase

## Consequences

### Positive
- **Cost efficiency**: Overall LLM cost reduced by ~60% vs GPT-4o-only
- **Fast enrichment**: User interactions feel snappy (mini latency < 1s)
- **Reliable chunking**: High-quality initial structure from GPT-4o
- **Flexible scaling**: Can adjust model mix based on usage patterns

### Negative
- **Two model contracts**: Must maintain prompts/schemas for both models
- **Enrichment quality variance**: Mini sometimes produces generic responses
- **Complexity**: Model selection logic adds code paths
- **Monitoring overhead**: Track quality/cost metrics per model

### Neutral
- **Model version lock-in**: Must test both models when OpenAI releases updates
- **Fallback strategy**: If mini fails, could retry with GPT-4o (not implemented in MVP)

## Alternatives Considered

### Alternative 1: GPT-4o for Everything

**Approach:** Use flagship model for all LLM operations

**Pros:**
- Simple architecture (one model contract)
- Consistent quality across all operations
- No model selection logic

**Cons:**
- **High cost**: $2-5 per 1000 documents (5-10x more expensive)
- **Slow enrichment**: Premium model overhead for simple tasks
- **Wasteful**: Overpaying for tasks that don't need flagship quality

**Rejected because:** Cost is prohibitive at scale. Enrichment doesn't justify GPT-4o pricing.

### Alternative 2: GPT-4o-mini for Everything

**Approach:** Use cost-optimized model for all operations

**Pros:**
- Lowest cost ($0.30-0.50 per 1000 documents)
- Simple architecture (one model)
- Fast response times

**Cons:**
- **Unreliable chunking**: 10-15% JSON schema violations in testing
- **Poor boundary detection**: Chunks split mid-sentence
- **Rework overhead**: Users must manually fix bad chunks
- **Hidden cost**: Engineering time fixing chunking issues exceeds savings

**Rejected because:** Quality issues create worse user experience than cost savings deliver.

### Alternative 3: Open-Source LLM (Llama 3, Mistral)

**Approach:** Self-host smaller open-source models

**Pros:**
- No per-token cost (only infra cost)
- Full control over model

**Cons:**
- **Infrastructure complexity**: GPU servers, model serving, autoscaling
- **Quality gap**: Open-source 7B-13B models struggle with structured output
- **Ops burden**: Monitoring, updates, fine-tuning
- **MVP scope creep**: Not aligned with "ship fast" priority

**Rejected because:** Adds operational complexity MVP can't afford. OpenAI API is simpler.

### Alternative 4: Prompt Engineering Mini for Chunking

**Approach:** Try to make GPT-4o-mini work for chunking via better prompts

**Pros:**
- Lower cost if successful
- Single model architecture

**Cons:**
- **Tested and failed**: 20+ prompt iterations still produced 10% error rate
- **Fundamental limitation**: Mini's context window/reasoning insufficient for complex documents
- **Time sink**: Engineering effort better spent on features

**Rejected because:** Empirical testing showed mini cannot reliably handle chunking.

## Implementation Notes

### Model Selection Logic
```typescript
enum LLMScenario {
  CHUNKING = 'chunking',         // Use GPT-4o
  ENRICHMENT = 'enrichment',     // Use GPT-4o-mini
  EMBEDDING = 'embedding'        // Use text-embedding-3-small
}

function selectModel(scenario: LLMScenario): string {
  switch (scenario) {
    case LLMScenario.CHUNKING:
      return 'gpt-4o';
    case LLMScenario.ENRICHMENT:
      return 'gpt-4o-mini';
    case LLMScenario.EMBEDDING:
      return 'text-embedding-3-small';
  }
}
```

### Cost Tracking
```typescript
interface LLMUsageMetrics {
  scenario: LLMScenario;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  latency: number;
  timestamp: Date;
}

// Log every LLM call for cost analysis
await metricsService.recordLLMUsage({
  scenario: LLMScenario.CHUNKING,
  model: 'gpt-4o',
  promptTokens: response.usage.prompt_tokens,
  completionTokens: response.usage.completion_tokens,
  cost: calculateCost('gpt-4o', response.usage),
  latency: responseTime,
  timestamp: new Date()
});
```

### Quality Monitoring
Track chunking quality metrics:
- JSON schema validation rate (target: 99%+)
- Average chunk size distribution (target: 200-800 tokens)
- User manual corrections per session (target: < 2)

Track enrichment quality metrics:
- User satisfaction (implicit: re-enrichment rate < 20%)
- Response time (target: < 2s p95)
- Cost per enrichment (target: < $0.001)

## References

- [Solution Architecture Document v2.1](/docs/sad.md) - Section 5.2: Two LLMs Pattern
- [OpenAI Pricing](https://openai.com/api/pricing/)
- [Architecture: LLM Module](/docs/architecture/modules/llm)
- Related ADR: [ADR-001: Vector-Only Storage](/docs/architecture/adr/001-vector-only-storage)
