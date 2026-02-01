---
"kms-rag-backend": minor
---

Add WebStrategy for URL content ingestion

- Implement WebStrategy to fetch and extract content from web URLs using Mozilla Readability
- Add URL validation with SSRF protection (blocks private IPs, localhost)
- Add configurable timeout, user-agent, and max content length settings
- Add custom error classes (UrlValidationError, FetchError, ContentExtractionError) with retry classification
- Add structured logging for observability (ingest_start, ingest_success, ingest_failure events)
