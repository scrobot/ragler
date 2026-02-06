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

// Complete payload schema
export const QdrantPayloadSchema = z.object({
  doc: DocMetadataSchema,
  chunk: ChunkMetadataSchema,
  tags: z.array(z.string().min(1).max(50)).max(12).default([]).describe('LLM-extracted topic tags'),
  acl: AclMetadataSchema,
});

// ============================================================================
// TypeScript Interfaces (inferred from Zod)
// ============================================================================

export type DocMetadata = z.infer<typeof DocMetadataSchema>;
export type ChunkMetadata = z.infer<typeof ChunkMetadataSchema>;
export type AclMetadata = z.infer<typeof AclMetadataSchema>;
export type QdrantPayload = z.infer<typeof QdrantPayloadSchema>;

// ============================================================================
// NestJS DTOs (for API validation)
// ============================================================================

export class DocMetadataDto extends createZodDto(DocMetadataSchema) {}
export class ChunkMetadataDto extends createZodDto(ChunkMetadataSchema) {}
export class AclMetadataDto extends createZodDto(AclMetadataSchema) {}
export class QdrantPayloadDto extends createZodDto(QdrantPayloadSchema) {}

// ============================================================================
// Chunk with full structure (used during chunking pipeline)
// ============================================================================

export interface Chunk {
  doc: DocMetadata;
  chunk: ChunkMetadata;
  tags: string[];
  acl: AclMetadata;
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
  // Remove 'sha256:' prefix from hash for cleaner ID
  const hash = contentHash.startsWith('sha256:')
    ? contentHash.substring(7)
    : contentHash;

  return `${sourceId}:${hash}`;
}
