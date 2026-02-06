import { z } from 'zod';
import { kmsClient } from '../client/kms-client.js';

const GetCollectionInputSchema = z.object({
  collection_id: z.string().uuid('Invalid collection ID'),
});

export const listCollectionsTool = {
  name: 'list_collections',
  description: 'List all available knowledge collections with their metadata',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [] as string[],
  },
};

export const getCollectionInfoTool = {
  name: 'get_collection_info',
  description: 'Get detailed information about a specific knowledge collection',
  inputSchema: {
    type: 'object' as const,
    properties: {
      collection_id: {
        type: 'string' as const,
        description: 'UUID of the collection',
      },
    },
    required: ['collection_id'] as string[],
  },
};

export async function handleListCollections() {
  try {
    const response = await kmsClient.listCollections();

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            collections: response.collections,
            total: response.total,
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
          text: `Error listing collections: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleGetCollectionInfo(args: unknown) {
  try {
    const input = GetCollectionInputSchema.parse(args);
    const collection = await kmsClient.getCollection(input.collection_id);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(collection, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error getting collection info: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
