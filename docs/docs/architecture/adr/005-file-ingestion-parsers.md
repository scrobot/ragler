# ADR 005: File Ingestion Parsers

## Context

RAGler originally supported only Confluence, web, and manual text ingestion. Users need to upload local documents (PDF, DOCX, TXT, Markdown, CSV) directly.

## Decision

Use `pdf-parse` for PDF and `mammoth` for DOCX extraction. Plain text formats (TXT, MD, CSV) are read as UTF-8. Each parser implements a shared `FileParser` interface and is selected by a resolver based on file extension.

## Consequences

- Lean dependencies (~50KB total) compared to heavyweight alternatives like Docling.
- Easy to extend by adding new parsers implementing `FileParser`.
- Limited to text extraction; no OCR or complex layout analysis.

## Alternatives considered

- Docling/Unstructured.io — too heavy for initial scope.
- Tika — requires JVM, complicates deployment.
