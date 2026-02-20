import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Chunk Schema - Enhanced payload structure for Qdrant points
 *
 * Features:
 * - Document metadata (doc.*)
 * - Rich chunk metadata (chunk.* with type, heading_path, content_hash)
 * - Tags extracted by LLM
 * - ACL for future access control
 */

// ============================================================================
// Enums & Types
// ============================================================================

export type ChunkType = 'knowledge' | 'navigation' | 'table_row' | 'glossary' | 'faq' | 'code';
export type SourceType = 'confluence' | 'web' | 'manual';
export type Language = 'ru' | 'en' | 'mixed';
export type Visibility = 'internal' | 'public';

// ============================================================================
// Zod Schemas
// ============================================================================

export const ChunkTypeSchema = z.enum([
  'knowledge',
  'navigation',
  'table_row',
  'glossary',
  'faq',
  'code',
]);

export const SourceTypeSchema = z.enum(['confluence', 'web', 'manual']);

export const LanguageSchema = z.enum(['ru', 'en', 'mixed']);

export const VisibilitySchema = z.enum(['internal', 'public']);

// Document metadata schema
export const DocMetadataSchema = z.object({
  source_type: SourceTypeSchema,
  source_id: z.string().describe('MD5 hash of source URL or manual content'),
  url: z.string().describe('Original source URL or manual://hash'),
  space_key: z.string().nullable().describe('Confluence space key (null for web/manual)'),
  title: z.string().nullable().describe('Document/page title'),
  revision: z.union([z.number(), z.string()]).describe('Document version'),
  last_modified_at: z.string().datetime().describe('ISO-8601 timestamp'),
  last_modified_by: z.string().nullable().describe('User email or ID'),
});

// Chunk metadata schema
export const ChunkMetadataSchema = z.object({
  id: z.string().describe('Stable chunk identifier: {source_id}:{content_hash}'),
  index: z.number().int().nonnegative().describe('Position in document (0-indexed)'),
  type: ChunkTypeSchema,
  heading_path: z.array(z.string()).describe('Heading hierarchy: ["Module 3", "3.1 Overview"]'),
  section: z.string().nullable().describe('Formatted section path: "Module 3 / 3.1"'),
  text: z.string().min(1).describe('Actual chunk content'),
  content_hash: z.string().regex(/^sha256:[a-f0-9]{64}$/).describe('SHA-256 hash for deduplication'),
  lang: LanguageSchema.describe('Detected language'),
});

// Access control schema
export const AclMetadataSchema = z.object({
  visibility: VisibilitySchema,
  allowed_groups: z.array(z.string()).default([]),
  allowed_users: z.array(z.string()).default([]),
});

// Editor metadata schema (Collection Editor - FTR-008)
export const EditorMetadataSchema = z.object({
  position: z.number().int().nonnegative().describe('Order within collection for retrieval optimization'),
  quality_score: z.number().min(0).max(100).nullable().describe('AI-assigned quality score (0-100)'),
  quality_issues: z.array(z.string()).default([]).describe('Identified quality issues'),
  last_edited_at: z.string().datetime().nullable().describe('ISO-8601 timestamp of last edit'),
  last_edited_by: z.string().nullable().describe('User ID who last edited'),
  edit_count: z.number().int().nonnegative().default(0).describe('Total number of edits'),
});

// Complete payload schema
export const QdrantPayloadSchema = z.object({
  doc: DocMetadataSchema,
  chunk: ChunkMetadataSchema,
  tags: z.array(z.string().min(1).max(50)).max(12).default([]).describe('LLM-extracted topic tags'),
  acl: AclMetadataSchema,
  editor: EditorMetadataSchema.optional().describe('Editor metadata for Collection Editor'),
});

// ============================================================================
// TypeScript Interfaces (inferred from Zod)
// ============================================================================

export type DocMetadata = z.infer<typeof DocMetadataSchema>;
export type ChunkMetadata = z.infer<typeof ChunkMetadataSchema>;
export type AclMetadata = z.infer<typeof AclMetadataSchema>;
export type EditorMetadata = z.infer<typeof EditorMetadataSchema>;
export type QdrantPayload = z.infer<typeof QdrantPayloadSchema>;

// ============================================================================
// NestJS DTOs (for API validation)
// ============================================================================

export class DocMetadataDto extends createZodDto(DocMetadataSchema) {}
export class ChunkMetadataDto extends createZodDto(ChunkMetadataSchema) {}
export class AclMetadataDto extends createZodDto(AclMetadataSchema) {}
export class EditorMetadataDto extends createZodDto(EditorMetadataSchema) {}
export class QdrantPayloadDto extends createZodDto(QdrantPayloadSchema) {}

// ============================================================================
// Chunk with full structure (used during chunking pipeline)
// ============================================================================

export interface Chunk {
  doc: DocMetadata;
  chunk: ChunkMetadata;
  tags: string[];
  acl: AclMetadata;
  editor?: EditorMetadata;
}

// ============================================================================
// Qdrant Point structure
// ============================================================================

export interface QdrantPoint {
  id: string; // Stable ID: {source_id}:{content_hash}
  vector: number[]; // 1536-dimensional embedding
  payload: QdrantPayload;
}

// ============================================================================
// Helper: Create default ACL
// ============================================================================

export function createDefaultAcl(): AclMetadata {
  return {
    visibility: 'internal',
    allowed_groups: [],
    allowed_users: [],
  };
}

// ============================================================================
// Helper: Create default editor metadata
// ============================================================================

export function createDefaultEditorMetadata(position: number, userId?: string): EditorMetadata {
  return {
    position,
    quality_score: null,
    quality_issues: [],
    last_edited_at: userId ? new Date().toISOString() : null,
    last_edited_by: userId ?? null,
    edit_count: 0,
  };
}

// ============================================================================
// Helper: Format section from heading path
// ============================================================================

export function formatSection(headingPath: string[]): string | null {
  if (!headingPath || headingPath.length === 0) {
    return null;
  }
  return headingPath.join(' / ');
}

// ============================================================================
// Helper: Generate stable chunk ID
// ============================================================================

export function generateChunkId(sourceId: string, contentHash: string): string {
  // Qdrant requires UUIDs or unsigned integers as point IDs
  // Generate a deterministic UUID v5 from sourceId + contentHash
  const crypto = require('crypto');

  // Remove 'sha256:' prefix from hash
  const hash = contentHash.startsWith('sha256:')
    ? contentHash.substring(7)
    : contentHash;

  // Create a deterministic string and hash it to get UUID format
  // Use the first 32 hex chars and format as UUID
  const combined = `${sourceId}:${hash}`;
  const md5Hash = crypto.createHash('md5').update(combined).digest('hex');

  // Format as UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  return `${md5Hash.substring(0, 8)}-${md5Hash.substring(8, 12)}-${md5Hash.substring(12, 16)}-${md5Hash.substring(16, 20)}-${md5Hash.substring(20, 32)}`;
}
