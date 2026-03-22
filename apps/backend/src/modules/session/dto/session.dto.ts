import { createZodDto } from 'nestjs-zod';
import {
  ChunkSchema,
  SessionResponseSchema,
  MergeChunksSchema,
  SplitChunkSchema,
  UpdateChunkSchema,
  PublishSchema,
  PreviewResponseSchema,
  PublishResponseSchema,
  SessionListItemSchema,
  SessionListResponseSchema,
  DeleteSessionResponseSchema,
  type Chunk,
  type SessionResponse,
  type MergeChunksInput,
  type SplitChunkInput,
  type UpdateChunkInput,
  type PublishInput,
  type PreviewResponse,
  type PublishResponse,
  type SessionListItem,
  type SessionListResponse,
  type DeleteSessionResponse,
} from '@ragler/shared';

export {
  ChunkSchema,
  type Chunk,
  type SessionResponse,
  type MergeChunksInput,
  type SplitChunkInput,
  type UpdateChunkInput,
  type PublishInput,
  type PreviewResponse,
  type PublishResponse,
  type SessionListItem,
  type SessionListResponse,
  type DeleteSessionResponse,
};

export type ChunkDto = Chunk;
export class SessionResponseDto extends createZodDto(SessionResponseSchema) {}
export class MergeChunksDto extends createZodDto(MergeChunksSchema) {}
export class SplitChunkDto extends createZodDto(SplitChunkSchema) {}
export class UpdateChunkDto extends createZodDto(UpdateChunkSchema) {}
export class PublishDto extends createZodDto(PublishSchema) {}
export class PreviewResponseDto extends createZodDto(PreviewResponseSchema) {}
export class PublishResponseDto extends createZodDto(PublishResponseSchema) {}
export class SessionListItemDto extends createZodDto(SessionListItemSchema) {}
export class SessionListResponseDto extends createZodDto(SessionListResponseSchema) {}
export class DeleteSessionResponseDto extends createZodDto(DeleteSessionResponseSchema) {}
