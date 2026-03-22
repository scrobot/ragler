import { CollectionAgentService } from '@modules/collection/agent/collection-agent.service';
import type { AgentEvent } from '@modules/collection/dto/agent.dto';

describe('CollectionAgentService', () => {
  let service: CollectionAgentService;

  const mockSettingsService = {
    getEffectiveApiKey: jest.fn().mockResolvedValue('test-key'),
    getEffectiveModel: jest.fn().mockResolvedValue('gpt-4o'),
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
    getSession: jest.fn().mockResolvedValue({ id: 'test' }),
    createSession: jest.fn().mockResolvedValue(undefined),
  };

  const mockPromptService = {
    getEffectivePrompt: jest.fn().mockResolvedValue('You are a helpful agent.'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new CollectionAgentService(
      mockSettingsService as never,
      mockChunkService as never,
      { generateEmbeddings: jest.fn() } as never,
      mockMemoryService as never,
      mockPromptService as never,
    );
    service.onModuleInit();
  });

  it('streams direct assistant response without tools', async () => {
    const generateMock = jest.fn().mockImplementation(async ({ onStepFinish }) => {
      onStepFinish({
        toolCalls: [],
        toolResults: [],
        text: 'Ready to help with collection quality.',
      });
      return { text: 'Ready to help with collection quality.' };
    });

    jest
      .spyOn(service as unknown as { createAgent: (...args: unknown[]) => unknown }, 'createAgent')
      .mockReturnValue({ generate: generateMock });

    const events: AgentEvent[] = [];
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
    expect(generateMock).toHaveBeenCalledTimes(1);
  });

  it('handles tool-call loop and emits tool events', async () => {
    const generateMock = jest.fn().mockImplementation(async ({ onStepFinish }) => {
      onStepFinish({
        toolCalls: [
          {
            toolName: 'analyze_collection_quality',
            input: { collectionId: '550e8400-e29b-41d4-a716-446655440000' },
          },
        ],
        toolResults: [
          {
            toolName: 'analyze_collection_quality',
            output: JSON.stringify({ score: 0.94, issues: [] }),
          },
        ],
        text: 'I found no quality issues in this collection.',
      });
      return { text: 'I found no quality issues in this collection.' };
    });

    jest
      .spyOn(service as unknown as { createAgent: (...args: unknown[]) => unknown }, 'createAgent')
      .mockReturnValue({ generate: generateMock });

    const events: AgentEvent[] = [];
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
    expect(generateMock).toHaveBeenCalledTimes(1);
    expect(mockMemoryService.addMessage).toHaveBeenCalledTimes(2);
  });
});
