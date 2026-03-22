import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { buildAgentTool, type AgentTool } from './tool.interface';

export type OperationType = 'SPLIT' | 'MERGE' | 'REWRITE' | 'DELETE' | 'KEEP';

export interface OperationSuggestion {
  operationId: string;
  action: OperationType;
  rationale: string;
  chunkId: string;
  splitPoints?: number[];
  splitBlocks?: string[];
  mergeWithIds?: string[];
  suggestedContent?: string;
}

const SUGGEST_PROMPT = `Analyze this chunk and suggest ONE improvement operation.

Chunk (ID: {chunkId}):
---
{content}
---

Surrounding context chunks:
{contextChunks}

Collection purpose: {collectionPurpose}

Suggest ONE of these actions:
- SPLIT: If chunk covers multiple distinct topics. Provide either:
  - splitPoints: character positions to split at
  - OR splitBlocks: the actual text blocks after splitting
- MERGE: If chunk is incomplete and a nearby chunk provides continuation. Provide mergeWithIds.
- REWRITE: If unclear, uses jargon, or could be improved. Provide suggestedContent with the improved text.
- DELETE: If chunk is a duplicate, irrelevant, or adds no value. Explain why.
- KEEP: If the chunk is good as-is. No action needed.

Return JSON:
{
  "action": "SPLIT|MERGE|REWRITE|DELETE|KEEP",
  "rationale": "detailed explanation of why this action is recommended",
  "splitPoints": [<positions if SPLIT>],
  "splitBlocks": ["<text blocks if SPLIT>"],
  "mergeWithIds": ["<chunk_ids if MERGE>"],
  "suggestedContent": "<new content if REWRITE>"
}`;

/**
 * Create the suggest_operation tool
 * Suggests improvement operations for chunks
 */
const suggestOperationSchema = z.object({
  chunkId: z.string().describe('Chunk ID to analyze'),
  content: z.string().describe('Chunk text content'),
  contextChunks: z
    .string()
    .optional()
    .describe('JSON array of surrounding chunks for context'),
  collectionPurpose: z.string().optional().describe('Collection purpose/audience'),
});

type SuggestOperationInput = z.infer<typeof suggestOperationSchema>;

export function createSuggestOperationTool(openai: OpenAI): AgentTool<SuggestOperationInput> {
  return buildAgentTool({
    name: 'suggest_operation',
    description:
      'Suggest an improvement operation for a chunk: SPLIT (if too broad), MERGE (if incomplete), REWRITE (if unclear), DELETE (if redundant), or KEEP (if good). Returns an operationId that can be used with execute_operation after user approval.',
    schema: suggestOperationSchema,
    parameters: {
      type: 'object',
      properties: {
        chunkId: { type: 'string', description: 'Chunk ID to analyze' },
        content: { type: 'string', description: 'Chunk text content' },
        contextChunks: {
          type: 'string',
          description: 'JSON array of surrounding chunks for context',
        },
        collectionPurpose: {
          type: 'string',
          description: 'Collection purpose/audience',
        },
      },
      required: ['chunkId', 'content'],
      additionalProperties: false,
    },
    execute: async ({ chunkId, content, contextChunks, collectionPurpose }): Promise<string> => {
      const prompt = SUGGEST_PROMPT.replace('{chunkId}', chunkId)
        .replace('{content}', content)
        .replace('{contextChunks}', contextChunks || 'No surrounding context provided')
        .replace('{collectionPurpose}', collectionPurpose || 'General knowledge retrieval');

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a RAG chunk optimization expert. Return only valid JSON.',
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 2000,
        });

        const resultText = response.choices[0]?.message?.content;
        if (!resultText) {
          throw new Error('Empty response from LLM');
        }

        const llmResult = JSON.parse(resultText);

        const suggestion: OperationSuggestion = {
          operationId: uuidv4(),
          action: llmResult.action || 'KEEP',
          rationale: llmResult.rationale || 'No rationale provided',
          chunkId,
        };

        switch (suggestion.action) {
          case 'SPLIT':
            if (llmResult.splitPoints && llmResult.splitPoints.length > 0) {
              suggestion.splitPoints = llmResult.splitPoints;
            }
            if (llmResult.splitBlocks && llmResult.splitBlocks.length > 1) {
              suggestion.splitBlocks = llmResult.splitBlocks;
            }
            break;
          case 'MERGE':
            suggestion.mergeWithIds = llmResult.mergeWithIds || [];
            break;
          case 'REWRITE':
            suggestion.suggestedContent = llmResult.suggestedContent || '';
            break;
        }

        return JSON.stringify(suggestion, null, 2);
      } catch (error) {
        return JSON.stringify({
          operationId: uuidv4(),
          action: 'KEEP',
          rationale: `Failed to analyze: ${error instanceof Error ? error.message : 'Unknown error'}`,
          chunkId,
          error: true,
        });
      }
    },
  });
}
