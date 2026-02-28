---
sidebar_position: 3
---

# File Upload Ingestion

## What this page is for

Upload PDF, DOCX, or plain text files to create draft sessions for chunking and publishing.

## Endpoint

- `POST /api/ingest/file` — multipart/form-data

## Supported formats

| Format | Extension | Parser |
|--------|-----------|--------|
| PDF | `.pdf` | pdf-parse |
| Word | `.docx` | mammoth |
| Plain text | `.txt` | UTF-8 reader |

Maximum file size: **10 MB**.

## Steps

1. Prepare a supported file (PDF, DOCX, or TXT).
2. Send as `multipart/form-data` with field name `file`.
3. Optionally include `chunkingConfig` to control chunking method.
4. Store the returned `sessionId` and proceed to session operations.

## Example

```bash
curl -X POST http://localhost:3000/api/ingest/file \
  -H "X-User-ID: user-1" \
  -F "file=@./document.pdf"
```

With custom chunking configuration:

```bash
curl -X POST http://localhost:3000/api/ingest/file \
  -H "X-User-ID: user-1" \
  -F "file=@./document.pdf" \
  -F "chunkingConfig={\"method\":\"character\",\"chunkSize\":500,\"overlap\":100}"
```

## Response

```json
{
  "sessionId": "abc-123",
  "sourceType": "file",
  "sourceUrl": "upload://document.pdf",
  "status": "created",
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

## Verify

- Response contains `sessionId`, `sourceType: "file"`, and timestamps.
- `GET /api/session/<id>` returns the draft with extracted text content.

## Troubleshooting

- **Unsupported file type**: only `.pdf`, `.docx`, and `.txt` are supported.
- **File too large**: maximum upload size is 10 MB.
- **Empty content**: ensure the file contains extractable text (scanned PDFs without OCR will produce empty content).

## Next steps

- [Sessions](/docs/product/sessions) — edit and refine the generated chunks.
- [Configurable Chunking](/docs/product/configurable-chunking) — control how content is split.
