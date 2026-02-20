// Collections
export interface Collection {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateCollectionRequest {
  name: string;
  description?: string;
}

export interface CollectionListResponse {
  collections: Collection[];
  total: number;
}

// Sessions & Chunks
export interface Chunk {
  id: string;
  text: string;
  isDirty: boolean;
}

export interface Session {
  sessionId: string;
  sourceUrl: string;
  sourceType: SourceType;
  status: string;
  chunks: Chunk[];
  /**
   * Raw HTML/XML content for source preview.
   * Present for web (HTML) and confluence (storage format XML) sources.
   * null for manual text sources.
   */
  rawContent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionListItem {
  sessionId: string;
  sourceUrl: string;
  sourceType: SourceType;
  status: string;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionListResponse {
  sessions: SessionListItem[];
  total: number;
}

export interface PreviewResponse {
  sessionId: string;
  status: string;
  chunks: Chunk[];
  isValid: boolean;
  warnings: string[];
}

export interface PublishRequest {
  targetCollectionId: string;
}

export interface PublishResponse {
  sessionId: string;
  publishedChunks: number;
  collectionId: string;
}

export interface DeleteSessionResponse {
  sessionId: string;
  deleted: boolean;
}

// Ingest
export type SourceType = 'manual' | 'confluence' | 'web';

export interface IngestManualRequest {
  sourceType: 'manual';
  content: string;
}

export interface IngestConfluenceRequest {
  sourceType: 'confluence';
  url?: string;
  pageId?: string;
}

export interface IngestWebRequest {
  sourceType: 'web';
  url: string;
}

export type IngestRequest =
  | IngestManualRequest
  | IngestConfluenceRequest
  | IngestWebRequest;

export interface IngestResponse {
  sessionId: string;
  sourceType: SourceType;
  sourceUrl: string;
  status: string;
  createdAt: string;
}

// Chunk operations
export interface MergeChunksRequest {
  chunkIds: string[];
}

export interface SplitChunkRequest {
  splitPoints?: number[];
  newTextBlocks?: string[];
}

export interface UpdateChunkRequest {
  text: string;
}

// API Error
export interface ApiError {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
}

// Health
export interface HealthResponse {
  status: 'ok' | 'error';
  details?: {
    redis?: { status: 'up' | 'down' };
    qdrant?: { status: 'up' | 'down' };
  };
}

// Editor Chunks (for Collection Editor)
export interface EditorChunk {
  id: string;
  content: string;
  doc: {
    source_id: string;
    source_type: SourceType;
    source_url: string;
    title: string | null;
  };
  chunk: {
    id: string;
    type: string;
    heading_path: string[];
    section: string;
  };
  tags: string[];
  editor?: {
    position: number;
    quality_score: number | null;
    quality_issues: string[];
    last_edited_at: string | null;
    last_edited_by: string | null;
    edit_count: number;
  };
}

export interface EditorChunkListResponse {
  chunks: EditorChunk[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListChunksQuery {
  limit?: number;
  offset?: number;
  sortBy?: 'position' | 'quality_score' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface CreateEditorChunkRequest {
  content: string;
  chunkType?: string;
  headingPath?: string[];
  tags?: string[];
  position?: number;
}

export interface UpdateEditorChunkRequest {
  content?: string;
  tags?: string[];
}

export interface SplitEditorChunkRequest {
  splitPoints?: number[];
  newTextBlocks?: string[];
}

export interface MergeEditorChunksRequest {
  chunkIds: string[];
  separator?: string;
}

export interface ReorderChunksRequest {
  chunkPositions: Array<{
    chunkId: string;
    position: number;
  }>;
}

export interface UpdateQualityScoreRequest {
  qualityScore: number;
  qualityIssues?: string[];
}

// Agent Events (for AI assistant)
export type AgentEventType = 'thinking' | 'tool_call' | 'tool_result' | 'message' | 'error' | 'done';

export interface AgentThinkingEvent {
  type: 'thinking';
  timestamp: string;
}

export interface AgentToolCallEvent {
  type: 'tool_call';
  tool: string;
  input: unknown;
  timestamp: string;
}

export interface AgentToolResultEvent {
  type: 'tool_result';
  tool: string;
  output: unknown;
  timestamp: string;
}

export interface AgentMessageEvent {
  type: 'message';
  content: string;
  timestamp: string;
}

export interface AgentErrorEvent {
  type: 'error';
  message: string;
  timestamp: string;
}

export interface AgentDoneEvent {
  type: 'done';
  timestamp: string;
}

export type AgentEvent =
  | AgentThinkingEvent
  | AgentToolCallEvent
  | AgentToolResultEvent
  | AgentMessageEvent
  | AgentErrorEvent
  | AgentDoneEvent;

export interface AgentChatRequest {
  message: string;
  sessionId: string;
}

export interface ApproveOperationRequest {
  sessionId: string;
}
