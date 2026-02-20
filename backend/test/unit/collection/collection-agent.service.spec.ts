import { CollectionAgentService } from '@modules/collection/agent/collection-agent.service';

describe('CollectionAgentService', () => {
  let service: CollectionAgentService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'openai.apiKey') return 'test-key';
      return undefined;
    }),
  };

  const mockChunkService = {
    listChunks: jest.fn().mockResolvedValue({
      chunks: [],
      total: 0,
      limit: 100,
      offset: 0,
    }),
    getChunk: jest.fn(),
    splitChunk: jest.fn(),
    mergeChunks: jest.fn(),
    updateChunk: jest.fn(),
    deleteChunk: jest.fn(),
    reorderChunks: jest.fn(),
  };

  const mockMemoryService = {
    loadHistory: jest.fn().mockResolvedValue([]),
    loadApprovedOperations: jest.fn().mockResolvedValue(new Set<string>()),
    addMessage: jest.fn().mockResolvedValue(undefined),
    approveOperation: jest.fn().mockResolvedValue(undefined),
    revokeApproval: jest.fn().mockResolvedValue(undefined),
    clearHistory: jest.fn().mockResolvedValue(undefined),
    clearApprovedOperations: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new CollectionAgentService(
      mockConfigService as never,
      mockChunkService as never,
      mockMemoryService as never,
    );
    service.onModuleInit();
  });

  it('streams direct assistant response without tools', async () => {
    const createMock = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Ready to help with collection quality.',
          },
        },
      ],
    });

    (service as unknown as { openai: { chat: { completions: { create: typeof createMock } } } }).openai = {
      chat: { completions: { create: createMock } },
    };

    const events = [];
    for await (const event of service.streamChat(
      '550e8400-e29b-41d4-a716-446655440000',
      'user@example.com',
      'Analyze this collection',
      '550e8400-e29b-41d4-a716-446655440111',
    )) {
      events.push(event);
    }

    expect(events.map((e) => e.type)).toEqual(['thinking', 'message', 'done']);
    expect(mockMemoryService.addMessage).toHaveBeenCalledTimes(2);
    expect(mockMemoryService.addMessage).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440111',
      expect.objectContaining({ role: 'human' }),
    );
    expect(mockMemoryService.addMessage).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440111',
      expect.objectContaining({ role: 'ai' }),
    );
  });

  it('handles tool-call loop and emits tool events', async () => {
    const createMock = jest
      .fn()
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: {
                    name: 'analyze_collection_quality',
                    arguments:
                      '{"collectionId":"550e8400-e29b-41d4-a716-446655440000"}',
                  },
                },
              ],
              content: null,
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'I found no quality issues in this collection.',
            },
          },
        ],
      });

    (service as unknown as { openai: { chat: { completions: { create: typeof createMock } } } }).openai = {
      chat: { completions: { create: createMock } },
    };

    const events = [];
    for await (const event of service.streamChat(
      '550e8400-e29b-41d4-a716-446655440000',
      'user@example.com',
      'Run quality analysis',
      '550e8400-e29b-41d4-a716-446655440112',
    )) {
      events.push(event);
    }

    expect(events.some((e) => e.type === 'tool_call')).toBe(true);
    expect(events.some((e) => e.type === 'tool_result')).toBe(true);
    expect(events.some((e) => e.type === 'message')).toBe(true);
    expect(events[events.length - 1]?.type).toBe('done');
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(mockChunkService.listChunks).toHaveBeenCalled();
  });
});
