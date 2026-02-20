# Security

## What this page is for

Document current security model and operational guardrails.

## Current model

- Request identity through `X-User-ID` header.
- No full IAM system in current baseline.
- Backend uses `helmet` and input validation.

## Controls

- Validate all request DTOs.
- Restrict network access to backend where possible.
- Protect environment secrets (`OPENAI_API_KEY`, Confluence credentials).

## Operational recommendations

1. Terminate TLS at ingress/reverse proxy.
2. Add authn/authz layer before internet exposure.
3. Add structured audit logs for sensitive operations.
