import { z } from 'zod';
import { kmsClient } from '../client/kms-client.js';

const SearchInputSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  collection_id: z.string().uuid('Invalid collection ID').optional(),
  limit: z.number().int().min(1).max(100).optional().default(10),
});

export const searchKnowledgeTool = {
  name: 'search_knowledge',
  description: 'Search across knowledge collections with semantic search. Returns relevant chunks from the knowledge base.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string' as const,
        description: 'Natural language search query',
      },
      collection_id: {
        type: 'string' as const,
        description: 'Optional UUID of specific collection to search. If omitted, searches all collections.',
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of results to return (1-100, default 10)',
        minimum: 1,
        maximum: 100,
        default: 10,
      },
    },
    required: ['query'] as string[],
  },
};

export async function handleSearchKnowledge(args: unknown) {
  try {
    // Validate input
    const input = SearchInputSchema.parse(args);

    // If collection_id not provided, we need to search across all collections
    // For now, require collection_id (searching all collections requires backend support)
    if (!input.collection_id) {
      throw new Error('collection_id is required. Searching all collections is not yet supported.');
    }

    // Call KMS API
    const response = await kmsClient.searchKnowledge({
      query: input.query,
      collectionId: input.collection_id,
      limit: input.limit,
    });

    // Format results for MCP response
    const formattedResults = response.results.map(r => ({
      id: r.id,
      score: r.score,
      content: r.content,
      source: {
        url: r.sourceUrl,
        type: r.sourceType,
      },
    }));

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            results: formattedResults,
            total: response.total,
            query: response.query,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error searching knowledge: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
