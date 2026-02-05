// User Roles
export type UserRole = 'ML' | 'DEV' | 'L2';

// Mode derived from role
export type UserMode = 'simple' | 'advanced';

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
  status: string;
  chunks: Chunk[];
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
