import { z } from 'zod';
import type { QdrantClientService } from '@infrastructure/qdrant';
import { buildAgentTool, type AgentTool } from './tool.interface';

// ============================================================================
// Detection rules (programmatic — no model judgment needed)
// ============================================================================

const HTML_TAG_REPLACE_REGEX = /<[^>]*>/g;
const HTML_TAG_TEST_REGEX = /<[^>]*>/;
const MIN_MEANINGFUL_TEXT_LENGTH = 20;
const MIN_CHUNK_TEXT_LENGTH = 50;

type DirtyReason = 'html_only' | 'too_short' | 'whitespace_only' | 'empty_payload';

function stripHtml(html: string): string {
    return html.replace(HTML_TAG_REPLACE_REGEX, ' ').replace(/\s+/g, ' ').trim();
}

function classifyChunk(text: string | undefined | null): DirtyReason | null {
    if (text === undefined || text === null) {
        return 'empty_payload';
    }

    const trimmed = text.trim();
    if (trimmed.length === 0) {
        return 'whitespace_only';
    }

    const stripped = stripHtml(trimmed);
    if (HTML_TAG_TEST_REGEX.test(trimmed) && stripped.length < MIN_MEANINGFUL_TEXT_LENGTH) {
        return 'html_only';
    }

    if (stripped.length < MIN_CHUNK_TEXT_LENGTH) {
        return 'too_short';
    }

    return null;
}

// ============================================================================
// scan_next_dirty_chunk tool
// ============================================================================

function toQdrantName(collectionId: string): string {
    return `kb_${collectionId}`;
}

const scanNextDirtyChunkSchema = z.object({
    collectionId: z.string().uuid().describe('Collection UUID to scan'),
    startOffset: z.number().int().min(0).optional().describe('Start scanning from this offset. Use 0 or omit for first call. Use nextOffset from previous result for subsequent calls.'),
});

type ScanNextDirtyChunkInput = z.infer<typeof scanNextDirtyChunkSchema>;

const SCAN_BATCH_SIZE = 50;

export function createScanNextDirtyChunkTool(
    qdrant: QdrantClientService,
): AgentTool<ScanNextDirtyChunkInput> {
    return buildAgentTool({
        name: 'scan_next_dirty_chunk',
        description:
            'Scan forward from startOffset to find the NEXT dirty chunk (HTML-only, too short, whitespace, empty). Returns one dirty chunk with its ID, reason, and preview. Call repeatedly with nextOffset to process the whole collection. Returns done=true when no more dirty chunks exist.',
        schema: scanNextDirtyChunkSchema,
        parameters: {
            type: 'object',
            properties: {
                collectionId: {
                    type: 'string',
                    format: 'uuid',
                    description: 'Collection UUID to scan',
                },
                startOffset: {
                    type: 'number',
                    description: 'Start scanning from this offset. Use 0 or omit for first call.',
                },
            },
            required: ['collectionId'],
            additionalProperties: false,
        },
        execute: async ({ collectionId, startOffset }): Promise<string> => {
            const name = toQdrantName(collectionId);
            let offset = startOffset ?? 0;

            while (true) {
                const result = await qdrant.scrollWithOrder(name, {
                    limit: SCAN_BATCH_SIZE,
                    offset,
                });

                const points = result.points as Array<{
                    id: string;
                    payload?: Record<string, unknown>;
                }>;

                if (points.length === 0) {
                    return JSON.stringify({
                        done: true,
                        scannedTotal: offset,
                        message: 'Scan complete. No more dirty chunks.',
                    });
                }

                for (let i = 0; i < points.length; i++) {
                    const point = points[i];
                    const chunkPayload = point.payload?.chunk as
                        | Record<string, unknown>
                        | undefined;
                    const text = chunkPayload?.text as string | undefined;
                    const reason = classifyChunk(text);

                    if (reason) {
                        return JSON.stringify({
                            done: false,
                            dirtyChunk: {
                                id: String(point.id),
                                reason,
                                preview: (text ?? '(no text)').substring(0, 100),
                            },
                            scannedSoFar: offset + i + 1,
                            nextOffset: offset + i + 1,
                        });
                    }
                }

                offset += points.length;

                if (points.length < SCAN_BATCH_SIZE) {
                    return JSON.stringify({
                        done: true,
                        scannedTotal: offset,
                        message: 'Scan complete. No more dirty chunks.',
                    });
                }
            }
        },
    });
}
