import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum RefineScenario {
  SIMPLIFY = 'simplify',
  CLARIFY_TERMS = 'clarify_terms',
  ADD_EXAMPLES = 'add_examples',
  REWRITE_FOR_AUDIENCE = 'rewrite_for_audience',
}

export class RefineRequestDto {
  @ApiProperty({ enum: RefineScenario, example: RefineScenario.SIMPLIFY })
  @IsEnum(RefineScenario)
  scenario: RefineScenario;

  @ApiProperty({ example: 'chunk_abc123', description: 'Chunk ID to refine' })
  @IsString()
  @IsNotEmpty()
  chunkId: string;

  @ApiProperty({ example: 'L2 Support', required: false, description: 'Target audience for rewriting' })
  @IsString()
  @IsOptional()
  targetAudience?: string;
}

export class RefineResponseDto {
  @ApiProperty({ example: 'chunk_abc123' })
  chunkId: string;

  @ApiProperty({ example: RefineScenario.SIMPLIFY })
  scenario: RefineScenario;

  @ApiProperty({ example: 'This is the original text...' })
  originalText: string;

  @ApiProperty({ example: 'This is the simplified text...' })
  refinedText: string;

  @ApiProperty({ example: false, description: 'Whether the refinement was applied' })
  applied: boolean;
}

export class ChunkRequestDto {
  @ApiProperty({ example: 'Long document content to be chunked...' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ChunkResponseDto {
  @ApiProperty({ example: ['Chunk 1 content...', 'Chunk 2 content...'] })
  chunks: string[];
}

export class EmbeddingRequestDto {
  @ApiProperty({ example: 'Text to generate embedding for' })
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class EmbeddingResponseDto {
  @ApiProperty({ example: [0.1, 0.2, 0.3], description: 'Vector embedding' })
  embedding: number[];

  @ApiProperty({ example: 1536 })
  dimensions: number;
}
