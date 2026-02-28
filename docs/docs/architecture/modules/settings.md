# Module: Settings

## Purpose

Manage agent configuration — LLM model selection and API key overrides — persisted in Redis.

## Endpoints

- `GET /api/settings/agent` — current agent configuration
- `PATCH /api/settings/agent` — update model or API key
- `GET /api/settings/agent/models` — list available models

## Responsibilities

- Store and retrieve agent settings from Redis
- Mask API keys in all responses (first 4 + last 4 characters)
- Provide the list of supported OpenAI models
- Supply the active model and API key to the LLM module

## Storage

Settings are persisted in Redis as key-value pairs, surviving pod restarts without requiring database migrations.
