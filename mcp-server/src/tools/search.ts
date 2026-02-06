import { z } from 'zod';
import { kmsClient } from '../client/kms-client.js';

const SearchInputSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  collection_id: z.string().uuid('Invalid collection ID').optional(),
  limit: z.number().int().min(1).max(100).optional().default(10),
  filters: z.object({
    source_types: z.array(z.enum(['confluence', 'web', 'manual'])).optional(),
    chunk_types: z.array(z.enum(['knowledge', 'navigation', 'table_row', 'glossary', 'faq', 'code'])).optional(),
    exclude_navigation: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

export const searchKnowledgeTool = {
  name: 'search_knowledge',
  description: 'Search across knowledge collections with semantic search. Returns relevant chunks with structured metadata including document hierarchy, tags, and source information. Automatically excludes navigation chunks unless the query has navigation intent.',
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
      filters: {
        type: 'object' as const,
        description: 'Optional filters to refine search results',
        properties: {
          source_types: {
            type: 'array' as const,
            items: { type: 'string' as const, enum: ['confluence', 'web', 'manual'] },
            description: 'Filter by source type',
          },
          chunk_types: {
            type: 'array' as const,
            items: { type: 'string' as const, enum: ['knowledge', 'navigation', 'table_row', 'glossary', 'faq', 'code'] },
            description: 'Filter by chunk type',
          },
          exclude_navigation: {
            type: 'boolean' as const,
            description: 'Exclude navigation chunks (default: true, auto-detected based on query intent)',
          },
          tags: {
            type: 'array' as const,
            items: { type: 'string' as const },
            description: 'Filter by LLM-extracted tags',
          },
        },
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

    // Call KMS API with filters
    const response = await kmsClient.searchKnowledge({
      query: input.query,
      collectionId: input.collection_id,
      limit: input.limit,
      filters: input.filters,
    });

    // Format results with rich citations
    const formattedResults = response.results.map(r => {
      // Build citation with heading path if available
      const citation = r.chunk.heading_path.length > 0
        ? `${r.doc.title || 'Untitled'} > ${r.chunk.heading_path.join(' > ')}`
        : r.doc.title || 'Untitled';

      return {
        content: r.content,
        citation: {
          title: r.doc.title || 'Untitled',
          url: r.doc.url,
          path: r.chunk.heading_path.join(' > '),
          section: r.chunk.section,
          source_type: r.doc.source_type,
          chunk_type: r.chunk.type,
          language: r.chunk.lang,
        },
        tags: r.tags,
        score: r.score,
      };
    });

    // Create formatted text output with better readability
    const resultsText = formattedResults.map((r, idx) => {
      const lines = [
        `## Result ${idx + 1} (Score: ${r.score.toFixed(3)})`,
        '',
        `**Content:**`,
        r.content,
        '',
        `**Citation:** ${r.citation.title}`,
        `**Path:** ${r.citation.path || 'N/A'}`,
        `**URL:** ${r.citation.url}`,
        `**Type:** ${r.citation.chunk_type} (${r.citation.source_type})`,
        `**Language:** ${r.citation.language}`,
        r.tags.length > 0 ? `**Tags:** ${r.tags.join(', ')}` : '',
        '',
        '---',
        '',
      ];
      return lines.filter(Boolean).join('\n');
    }).join('\n');

    const summaryText = [
      `# Search Results for "${response.query}"`,
      '',
      `Found ${response.total} results:`,
      '',
      resultsText,
    ].join('\n');

    return {
      content: [
        {
          type: 'text' as const,
          text: summaryText,
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
