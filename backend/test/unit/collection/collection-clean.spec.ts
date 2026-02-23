import { CollectionAgentService } from '@modules/collection/agent/collection-agent.service';
import type { AgentEvent } from '@modules/collection/dto/agent.dto';

// ============================================================================
// classifyChunk detection rules (replicated from service internals for testing)
// ============================================================================

const HTML_TAG_REPLACE = /<[^>]*>/g;
const HTML_TAG_TEST = /<[^>]*>/;
const MIN_MEANINGFUL = 20;
const MIN_CHUNK_LEN = 50;
const BASE64_PATTERN = /[A-Za-z0-9+/=]{100,}/;
const JSON_BLOB_PATTERN = /"\w+":\s*(?:true|false|null|"|\d|\[|\{)/g;

function classifyChunk(text: string | undefined | null): string | null {
    if (text === undefined || text === null) return 'empty_payload';
    const trimmed = text.trim();
    if (trimmed.length === 0) return 'whitespace_only';
    const stripped = trimmed.replace(HTML_TAG_REPLACE, ' ').replace(/\s+/g, ' ').trim();
    if (HTML_TAG_TEST.test(trimmed) && stripped.length < MIN_MEANINGFUL) return 'html_only';
    if (stripped.length < MIN_CHUNK_LEN) return 'too_short';
    if (BASE64_PATTERN.test(trimmed)) return 'base64_blob';
    const jsonMatches = trimmed.match(JSON_BLOB_PATTERN);
    if (jsonMatches && jsonMatches.length >= 5) {
        const jsonCharCount = jsonMatches.reduce((sum, m) => sum + m.length, 0);
        if (jsonCharCount / trimmed.length > 0.15) return 'json_blob';
    }
    return null;
}

// ============================================================================
// classifyChunk unit tests
// ============================================================================

describe('classifyChunk', () => {
    describe('empty_payload', () => {
        it('returns empty_payload for undefined', () => {
            expect(classifyChunk(undefined)).toBe('empty_payload');
        });

        it('returns empty_payload for null', () => {
            expect(classifyChunk(null)).toBe('empty_payload');
        });
    });

    describe('whitespace_only', () => {
        it('returns whitespace_only for empty string', () => {
            expect(classifyChunk('')).toBe('whitespace_only');
        });

        it('returns whitespace_only for whitespace', () => {
            expect(classifyChunk('   \n\t  ')).toBe('whitespace_only');
        });
    });

    describe('html_only', () => {
        it('detects HTML with no meaningful text', () => {
            expect(classifyChunk('<div class="foo"><span></span></div>')).toBe('html_only');
        });

        it('detects HTML with minimal text', () => {
            expect(classifyChunk('<link rel="apple-touch-icon" sizes="114x114" href="/icon.png">')).toBe('html_only');
        });

        it('does NOT flag HTML with meaningful text', () => {
            const htmlWithText = '<div><p>' + 'This is a meaningful paragraph with real content that should not be flagged. '.repeat(2) + '</p></div>';
            expect(classifyChunk(htmlWithText)).toBeNull();
        });
    });

    describe('too_short', () => {
        it('returns too_short for very short text', () => {
            expect(classifyChunk('Hello world')).toBe('too_short');
        });

        it('returns too_short for text just under threshold', () => {
            expect(classifyChunk('A'.repeat(49))).toBe('too_short');
        });

        it('does NOT flag text at threshold', () => {
            expect(classifyChunk('A'.repeat(50))).toBeNull();
        });
    });

    describe('base64_blob', () => {
        it('detects JPEG base64 data', () => {
            const base64 = 'AQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAKAAoDASEAAhEBAxEB';
            expect(classifyChunk(base64)).toBe('base64_blob');
        });

        it('detects PNG base64 data', () => {
            const base64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7';
            expect(classifyChunk(base64)).toBe('base64_blob');
        });

        it('detects base64 mixed with JSON metadata', () => {
            const mixed = `"base64preview":"/9j/4AAQSkZJRgABAQIAHAAcAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD${'A'.repeat(100)}"`;
            expect(classifyChunk(mixed)).toBe('base64_blob');
        });

        it('does NOT flag short base64-like strings', () => {
            const shortBase64 = 'Normal text with some ABCdef12345 embedded.'.repeat(2);
            expect(classifyChunk(shortBase64)).toBeNull();
        });
    });

    describe('json_blob', () => {
        it('detects raw JSON API response dumps', () => {
            const jsonDump = '{"isSubscribed":false,"isVerified":false,"isCompany":false,"isPlus":false,"isDisabledAd":false,"isPro":false}';
            expect(classifyChunk(jsonDump)).toBe('json_blob');
        });

        it('detects nested JSON with arrays', () => {
            const jsonDump = '{"data":{"id":1234,"type":"user","name":"test","counters":{"subscribers":160,"subscriptions":0,"achievements":0,"entries":1,"comments":0}}}';
            expect(classifyChunk(jsonDump)).toBe('json_blob');
        });

        it('does NOT flag text that happens to contain a couple JSON-like patterns', () => {
            const normalText = 'This is a normal paragraph that talks about things. It has "name": values but is mostly text content with plenty of words and sentences that make it look like real content.';
            expect(classifyChunk(normalText)).toBeNull();
        });
    });

    describe('clean chunks', () => {
        it('returns null for normal text', () => {
            expect(classifyChunk('This is a completely normal paragraph with enough text content to pass all the detection rules and be considered clean.')).toBeNull();
        });

        it('returns null for Russian text', () => {
            expect(classifyChunk('Мгновенная блокировка спамеров. Max проверяет каждого нового участника и удаляет подозрительные аккаунты.')).toBeNull();
        });

        it('returns null for text with minimal HTML', () => {
            const text = 'Here is a paragraph with <b>bold text</b> and some <i>italics</i>. This should be considered clean content.';
            expect(classifyChunk(text)).toBeNull();
        });
    });
});

// ============================================================================
// streamCleanCollection integration tests
// ============================================================================

describe('CollectionAgentService.streamCleanCollection', () => {
    let service: CollectionAgentService;

    // Qdrant mock with controllable scroll responses
    let scrollResponses: Array<{
        points: Array<{ id: string; payload?: Record<string, unknown> }>;
        next_page_offset: string | null;
    }>;
    let deletedPointIds: string[];
    let updatedPayloads: Array<{ id: string; payload: Record<string, unknown> }>;

    const mockQdrant = {
        getClient: jest.fn(),
        countPoints: jest.fn(),
        deletePoints: jest.fn(),
        updatePayloads: jest.fn(),
        scrollWithOrder: jest.fn(),
    };

    const mockSettingsService = {
        getEffectiveApiKey: jest.fn().mockResolvedValue('test-key'),
        getEffectiveModel: jest.fn().mockResolvedValue('gpt-4o-mini'),
    };

    const mockLlmService = {};
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
        scrollResponses = [];
        deletedPointIds = [];
        updatedPayloads = [];

        // Track deletePoints calls
        mockQdrant.deletePoints.mockImplementation(async (_name: string, ids: string[]) => {
            deletedPointIds.push(...ids);
        });

        // Track updatePayloads calls
        mockQdrant.updatePayloads.mockImplementation(async (_name: string, updates: Array<{ id: string; payload: Record<string, unknown> }>) => {
            updatedPayloads.push(...updates);
        });

        // Scroll returns pre-configured responses in sequence
        let scrollCallIndex = 0;
        mockQdrant.getClient.mockReturnValue({
            scroll: jest.fn().mockImplementation(async () => {
                const response = scrollResponses[scrollCallIndex] ?? { points: [], next_page_offset: null };
                scrollCallIndex++;
                return response;
            }),
        });

        service = new CollectionAgentService(
            mockSettingsService as never,
            mockQdrant as never,
            mockLlmService as never,
            mockMemoryService as never,
            mockPromptService as never,
        );
        service.onModuleInit();
    });

    async function collectEvents(collectionId: string): Promise<AgentEvent[]> {
        const events: AgentEvent[] = [];
        for await (const event of service.streamCleanCollection(collectionId)) {
            events.push(event);
        }
        return events;
    }

    it('emits clean_complete with zero deletions for an empty collection', async () => {
        mockQdrant.countPoints.mockResolvedValue(0);

        // Pass 1 scroll: no points
        scrollResponses.push({ points: [], next_page_offset: null });
        // Pass 2 scroll: no points
        scrollResponses.push({ points: [], next_page_offset: null });

        const events = await collectEvents('test-collection-id');

        const complete = events.find((e) => e.type === 'clean_complete') as any;
        expect(complete).toBeDefined();
        expect(complete.totalScanned).toBe(0);
        expect(complete.totalDeleted).toBe(0);
        expect(complete.totalCleaned).toBe(0);
    });

    it('deletes junk chunks and emits correct events', async () => {
        mockQdrant.countPoints.mockResolvedValue(3);

        // Pass 1: 3 points — 1 html_only junk, 1 base64 junk, 1 clean
        scrollResponses.push({
            points: [
                {
                    id: 'junk-html',
                    payload: { chunk: { text: '<div class="x"><span></span></div>' } },
                },
                {
                    id: 'junk-base64',
                    payload: { chunk: { text: 'A'.repeat(150) } },
                },
                {
                    id: 'clean-chunk',
                    payload: { chunk: { text: 'This is a clean paragraph with enough text to pass all detection rules safely.' } },
                },
            ],
            next_page_offset: null,
        });

        // Pass 2: only clean-chunk remains (after deletions)
        scrollResponses.push({
            points: [
                {
                    id: 'clean-chunk',
                    payload: { chunk: { text: 'This is a clean paragraph with enough text to pass all detection rules safely.' } },
                },
            ],
            next_page_offset: null,
        });

        const events = await collectEvents('test-collection-id');

        // Check dirty_chunk_found events
        const foundEvents = events.filter((e) => e.type === 'dirty_chunk_found') as any[];
        expect(foundEvents).toHaveLength(2);
        expect(foundEvents[0].chunkId).toBe('junk-html');
        expect(foundEvents[0].reason).toBe('html_only');
        expect(foundEvents[1].chunkId).toBe('junk-base64');
        expect(foundEvents[1].reason).toBe('base64_blob');

        // Check dirty_chunk_deleted events
        const deletedEvents = events.filter((e) => e.type === 'dirty_chunk_deleted') as any[];
        expect(deletedEvents).toHaveLength(2);

        // Check Qdrant deletePoints was called
        expect(deletedPointIds).toEqual(['junk-html', 'junk-base64']);

        // Check final summary
        const complete = events.find((e) => e.type === 'clean_complete') as any;
        expect(complete.totalScanned).toBe(3);
        expect(complete.totalDeleted).toBe(2);
        expect(complete.remaining).toBe(1);
        expect(complete.breakdown).toEqual({
            html_only: 1,
            base64_blob: 1,
        });
    });

    it('detects all junk types correctly', async () => {
        mockQdrant.countPoints.mockResolvedValue(6);

        scrollResponses.push({
            points: [
                { id: 'p1', payload: { chunk: { text: null } } },
                { id: 'p2', payload: { chunk: { text: '   \n ' } } },
                { id: 'p3', payload: { chunk: { text: '<div><img src="x" /></div>' } } },
                { id: 'p4', payload: { chunk: { text: 'Short' } } },
                { id: 'p5', payload: { chunk: { text: 'B'.repeat(200) } } },
                {
                    id: 'p6',
                    payload: { chunk: { text: '{"a":true,"b":false,"c":null,"d":"x","e":1,"f":[1],"g":{"h":"i"}}' } },
                },
            ],
            next_page_offset: null,
        });
        // Pass 2 (nothing left)
        scrollResponses.push({ points: [], next_page_offset: null });

        const events = await collectEvents('test-collection-id');

        const foundEvents = events.filter((e) => e.type === 'dirty_chunk_found') as any[];
        const reasons = foundEvents.map((e: any) => e.reason);

        expect(reasons).toContain('empty_payload');
        expect(reasons).toContain('whitespace_only');
        expect(reasons).toContain('html_only');
        expect(reasons).toContain('too_short');
        expect(reasons).toContain('base64_blob');
        expect(reasons).toContain('json_blob');
        expect(foundEvents).toHaveLength(6);
    });

    it('handles pagination correctly across multiple pages', async () => {
        mockQdrant.countPoints.mockResolvedValue(4);

        // Pass 1 page 1: 2 points
        scrollResponses.push({
            points: [
                { id: 'p1', payload: { chunk: { text: 'Clean paragraph one with enough text to pass detection rules successfully and not be flagged.' } } },
                { id: 'p2', payload: { chunk: { text: '' } } },
            ],
            next_page_offset: 'cursor-abc',
        });

        // Pass 1 page 2: 2 more points
        scrollResponses.push({
            points: [
                { id: 'p3', payload: { chunk: { text: 'Clean paragraph two with enough text to pass detection rules successfully and not be flagged.' } } },
                { id: 'p4', payload: { chunk: { text: 'x'.repeat(10) } } },
            ],
            next_page_offset: null,
        });

        // Pass 2 page 1: remaining clean chunks
        scrollResponses.push({
            points: [
                { id: 'p1', payload: { chunk: { text: 'Clean paragraph one with enough text to pass detection rules successfully and not be flagged.' } } },
                { id: 'p3', payload: { chunk: { text: 'Clean paragraph two with enough text to pass detection rules successfully and not be flagged.' } } },
            ],
            next_page_offset: null,
        });

        const events = await collectEvents('test-collection-id');

        // Should have scanned 4 total
        const complete = events.find((e) => e.type === 'clean_complete') as any;
        expect(complete.totalScanned).toBe(4);
        expect(complete.totalDeleted).toBe(2);

        // Should have emitted 2 progress events (one per page)
        const progressEvents = events.filter((e) => e.type === 'clean_progress');
        expect(progressEvents).toHaveLength(2);
    });

    it('emits thinking event at start', async () => {
        mockQdrant.countPoints.mockResolvedValue(0);
        scrollResponses.push({ points: [], next_page_offset: null });
        scrollResponses.push({ points: [], next_page_offset: null });

        const events = await collectEvents('test-id');

        expect(events[0].type).toBe('thinking');
    });

    it('emits message event between pass 1 and pass 2', async () => {
        mockQdrant.countPoints.mockResolvedValue(0);
        scrollResponses.push({ points: [], next_page_offset: null });
        scrollResponses.push({ points: [], next_page_offset: null });

        const events = await collectEvents('test-id');

        const messageEvent = events.find((e) => e.type === 'message') as any;
        expect(messageEvent).toBeDefined();
        expect(messageEvent.content).toContain('Pass 1 done');
    });

    it('throws on Qdrant failure during countPoints', async () => {
        mockQdrant.countPoints.mockRejectedValue(new Error('Qdrant connection refused'));

        await expect(collectEvents('test-id')).rejects.toThrow('Qdrant connection refused');
    });

    it('does not delete clean chunks', async () => {
        mockQdrant.countPoints.mockResolvedValue(2);

        scrollResponses.push({
            points: [
                {
                    id: 'good-1',
                    payload: { chunk: { text: 'This is a perfectly normal paragraph with enough text to be considered valuable content.' } },
                },
                {
                    id: 'good-2',
                    payload: { chunk: { text: 'Это нормальный абзац с достаточным количеством текста, который должен быть сохранен.' } },
                },
            ],
            next_page_offset: null,
        });
        // Pass 2: same points (nothing deleted)
        scrollResponses.push({
            points: [
                {
                    id: 'good-1',
                    payload: { chunk: { text: 'This is a perfectly normal paragraph with enough text to be considered valuable content.' } },
                },
                {
                    id: 'good-2',
                    payload: { chunk: { text: 'Это нормальный абзац с достаточным количеством текста, который должен быть сохранен.' } },
                },
            ],
            next_page_offset: null,
        });

        const events = await collectEvents('test-collection-id');

        expect(deletedPointIds).toHaveLength(0);
        const complete = events.find((e) => e.type === 'clean_complete') as any;
        expect(complete.totalDeleted).toBe(0);
        expect(complete.totalScanned).toBe(2);
    });
});
