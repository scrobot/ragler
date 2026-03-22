import { z } from 'zod';
import OpenAI from 'openai';
import { buildAgentTool, type AgentTool } from './tool.interface';

interface ChunkScoreResult {
  score: number;
  breakdown: {
    clarity: number;
    completeness: number;
    specificity: number;
    standalone: number;
  };
  issues: string[];
  suggestions: string[];
}

const SCORE_PROMPT = `You are a RAG chunk quality evaluator. Score this chunk for retrieval quality.

Collection purpose: {collectionPurpose}

Chunk content:
---
{content}
---

Evaluate on these criteria (each 0-25 points, total 0-100):

1. CLARITY (0-25): Is the content clear and unambiguous?
   - 25: Crystal clear, no ambiguity
   - 15-24: Mostly clear, minor ambiguities
   - 5-14: Some unclear parts
   - 0-4: Confusing or unclear

2. COMPLETENESS (0-25): Does it provide enough context?
   - 25: Complete, self-contained information
   - 15-24: Mostly complete, minor gaps
   - 5-14: Missing important context
   - 0-4: Severely incomplete

3. SPECIFICITY (0-25): Is it focused on a specific topic?
   - 25: Tightly focused on one topic
   - 15-24: Mostly focused, slight tangents
   - 5-14: Covers too many topics
   - 0-4: Unfocused, rambling

4. STANDALONE (0-25): Can it be understood without other chunks?
   - 25: Fully understandable alone
   - 15-24: Mostly standalone, minor references
   - 5-14: Needs other context
   - 0-4: Cannot understand without context

Return JSON:
{
  "score": <total 0-100>,
  "breakdown": {
    "clarity": <0-25>,
    "completeness": <0-25>,
    "specificity": <0-25>,
    "standalone": <0-25>
  },
  "issues": ["list of specific issues found"],
  "suggestions": ["list of improvement suggestions"]
}`;

/**
 * Create the score_chunk tool
 * Scores a chunk for RAG retrieval quality using LLM
 */
const scoreChunkSchema = z.object({
  chunkId: z.string().describe('Chunk ID being scored'),
  content: z.string().describe('Chunk text content to evaluate'),
  collectionPurpose: z
    .string()
    .optional()
    .describe('Collection purpose/audience for context'),
});

type ScoreChunkInput = z.infer<typeof scoreChunkSchema>;

export function createScoreChunkTool(openai: OpenAI): AgentTool<ScoreChunkInput> {
  return buildAgentTool({
    name: 'score_chunk',
    description:
      'Score a chunk for RAG retrieval quality (0-100) with breakdown by clarity, completeness, specificity, and standalone readability. Returns issues and improvement suggestions.',
    schema: scoreChunkSchema,
    parameters: {
      type: 'object',
      properties: {
        chunkId: { type: 'string', description: 'Chunk ID being scored' },
        content: { type: 'string', description: 'Chunk text content to evaluate' },
        collectionPurpose: {
          type: 'string',
          description: 'Collection purpose/audience for context',
        },
      },
      required: ['chunkId', 'content'],
      additionalProperties: false,
    },
    execute: async ({ chunkId, content, collectionPurpose }): Promise<string> => {
      const prompt = SCORE_PROMPT.replace(
        '{collectionPurpose}',
        collectionPurpose || 'General knowledge retrieval',
      ).replace('{content}', content);

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a RAG quality evaluator. Return only valid JSON.',
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 500,
        });

        const resultText = response.choices[0]?.message?.content;
        if (!resultText) {
          throw new Error('Empty response from LLM');
        }

        const result: ChunkScoreResult = JSON.parse(resultText);

        result.score = Math.min(100, Math.max(0, result.score));
        result.breakdown = {
          clarity: Math.min(25, Math.max(0, result.breakdown?.clarity ?? 0)),
          completeness: Math.min(25, Math.max(0, result.breakdown?.completeness ?? 0)),
          specificity: Math.min(25, Math.max(0, result.breakdown?.specificity ?? 0)),
          standalone: Math.min(25, Math.max(0, result.breakdown?.standalone ?? 0)),
        };

        return JSON.stringify(
          {
            chunkId,
            ...result,
          },
          null,
          2,
        );
      } catch (error) {
        return JSON.stringify({
          chunkId,
          error: `Failed to score chunk: ${error instanceof Error ? error.message : 'Unknown error'}`,
          score: null,
        });
      }
    },
  });
}
