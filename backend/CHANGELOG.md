# kms-rag-backend

## 1.1.0

### Minor Changes

- Migrate DTO validation from class-validator to Zod schemas

  - Replace class-validator decorators with Zod schemas across all DTOs
  - Add global ZodValidationPipe from nestjs-zod for request validation
  - Add ZodValidationPipe utility for custom schema validation
  - Introduce nestjs-zod integration for Swagger schema generation
  - Update ErrorResponseDto, CollectionDto, IngestDto, LlmDto, SessionDto, and VectorDto
  - Improved type safety with explicit Zod schema inference
