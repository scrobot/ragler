import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { ChunkService } from '../../chunk.service';
import type { EditorChunkResponse } from '../../dto';

interface QualityAnalysis {
  totalChunks: number;
  avgLength: number;
  lengthDistribution: {
    tooShort: number;
    optimal: number;
    tooLong: number;
  };
  qualityStats: {
    scored: number;
    unscored: number;
    avgScore: number | null;
    lowScoreCount: number;
  };
  potentialIssues: Array<{
    type: 'too_long' | 'too_short' | 'low_quality' | 'duplicate_candidate';
    chunkId: string;
    description: string;
  }>;
  duplicateCandidates: Array<{
    chunk1Id: string;
    chunk2Id: string;
    similarity: number;
  }>;
}

/**
 * Create the analyze_collection_quality tool
 * Analyzes a collection for quality issues
 */
export function createAnalyzeQualityTool(chunkService: ChunkService): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'analyze_collection_quality',
    description:
      'Analyze a collection for quality issues including duplicates, too-long/short chunks, and low quality scores. Returns a comprehensive quality report.',
    schema: z.object({
      collectionId: z.string().uuid().describe('Collection UUID to analyze'),
    }),
    func: async ({ collectionId }): Promise<string> => {
      const allChunks: EditorChunkResponse[] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const result = await chunkService.listChunks(collectionId, {
          limit,
          offset,
          sortBy: 'position',
          sortOrder: 'asc',
        });
        allChunks.push(...result.chunks);
        if (result.chunks.length < limit) break;
        offset += limit;
      }

      if (allChunks.length === 0) {
        return JSON.stringify({
          totalChunks: 0,
          message: 'Collection is empty. No chunks to analyze.',
        });
      }

      const analysis: QualityAnalysis = {
        totalChunks: allChunks.length,
        avgLength: 0,
        lengthDistribution: { tooShort: 0, optimal: 0, tooLong: 0 },
        qualityStats: { scored: 0, unscored: 0, avgScore: null, lowScoreCount: 0 },
        potentialIssues: [],
        duplicateCandidates: [],
      };

      let totalLength = 0;
      let totalScore = 0;

      for (const chunk of allChunks) {
        const length = chunk.content.length;
        totalLength += length;

        if (length < 100) {
          analysis.lengthDistribution.tooShort++;
          analysis.potentialIssues.push({
            type: 'too_short',
            chunkId: chunk.id,
            description: `Chunk is very short (${length} chars) - may lack context`,
          });
        } else if (length > 2000) {
          analysis.lengthDistribution.tooLong++;
          analysis.potentialIssues.push({
            type: 'too_long',
            chunkId: chunk.id,
            description: `Chunk is very long (${length} chars) - consider splitting`,
          });
        } else {
          analysis.lengthDistribution.optimal++;
        }

        if (chunk.editor?.quality_score !== null && chunk.editor?.quality_score !== undefined) {
          analysis.qualityStats.scored++;
          totalScore += chunk.editor.quality_score;
          if (chunk.editor.quality_score < 50) {
            analysis.qualityStats.lowScoreCount++;
            analysis.potentialIssues.push({
              type: 'low_quality',
              chunkId: chunk.id,
              description: `Low quality score (${chunk.editor.quality_score}/100)${chunk.editor.quality_issues.length > 0 ? `: ${chunk.editor.quality_issues.join(', ')}` : ''}`,
            });
          }
        } else {
          analysis.qualityStats.unscored++;
        }
      }

      analysis.avgLength = Math.round(totalLength / allChunks.length);
      analysis.qualityStats.avgScore =
        analysis.qualityStats.scored > 0
          ? Math.round(totalScore / analysis.qualityStats.scored)
          : null;

      const contentHashes = new Map<string, { chunkId: string; content: string }[]>();

      for (const chunk of allChunks) {
        const key = chunk.content.slice(0, 50).toLowerCase().replace(/\s+/g, '');
        const existing = contentHashes.get(key) || [];
        existing.push({ chunkId: chunk.id, content: chunk.content });
        contentHashes.set(key, existing);
      }

      for (const [, chunks] of contentHashes) {
        if (chunks.length > 1) {
          for (let i = 0; i < chunks.length - 1; i++) {
            for (let j = i + 1; j < chunks.length; j++) {
              const similarity = calculateSimilarity(chunks[i].content, chunks[j].content);
              if (similarity > 0.8) {
                analysis.duplicateCandidates.push({
                  chunk1Id: chunks[i].chunkId,
                  chunk2Id: chunks[j].chunkId,
                  similarity: Math.round(similarity * 100),
                });
                analysis.potentialIssues.push({
                  type: 'duplicate_candidate',
                  chunkId: chunks[i].chunkId,
                  description: `Possible duplicate with chunk ${chunks[j].chunkId} (${Math.round(similarity * 100)}% similar)`,
                });
              }
            }
          }
        }
      }

      return JSON.stringify(analysis, null, 2);
    },
  });
}

function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 2));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}
