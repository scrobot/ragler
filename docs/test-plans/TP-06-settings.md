# TP-06: Settings

**Module:** Settings
**Pages:** `/settings/prompts`, `/settings/agent`, `/settings/features`
**Priority:** Medium
**Last updated:** 2026-03-14

---

## 1. Overview

Три страницы настроек: System Prompts (кастомизация agent system prompt), Agent Model (выбор модели и API key), Feature Flags (включение/отключение фич).

---

## 2. Test Cases

### 2.1 System Prompts (`/settings/prompts`)

#### TC-06.01: Отображение страницы System Prompts

| Field | Value |
|-------|-------|
| **ID** | TC-06.01 |
| **Title** | Страница System Prompts загружается с двумя табами |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Smoke |
| **Preconditions** | Backend запущен. |
| **Steps** | 1. Перейти на `/settings/prompts` |
| **Expected Result** | Заголовок "Agent System Prompts". Подзаголовок: "Edit the system prompt that guides the AI agent. Changes take effect on the next chat message." Два таба: "Global Prompt", "Collection Override". Global Prompt показывает текущий prompt в текстовом редакторе. Badge "Default". Кнопка "Save". |

---

#### TC-06.02: Редактирование Global Prompt

| Field | Value |
|-------|-------|
| **ID** | TC-06.02 |
| **Title** | Изменение и сохранение Global System Prompt |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Страница System Prompts, таб Global Prompt. |
| **Steps** | 1. Изменить текст в prompt editor 2. Нажать "Save" |
| **Expected Result** | Prompt сохранён. Toast "Prompt saved". Badge меняется с "Default" на "Custom" (или аналогичное). Новый prompt используется в следующих agent-чатах. |

---

#### TC-06.03: Reset Global Prompt к default

| Field | Value |
|-------|-------|
| **ID** | TC-06.03 |
| **Title** | Сброс Global Prompt к значению по умолчанию |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | Global Prompt изменён. |
| **Steps** | 1. Нажать кнопку Reset / Delete override |
| **Expected Result** | Prompt возвращается к дефолтному. Badge "Default". |

---

#### TC-06.04: Collection Override — выбор коллекции и override

| Field | Value |
|-------|-------|
| **ID** | TC-06.04 |
| **Title** | Установка collection-specific prompt override |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Таб "Collection Override". Есть коллекции. |
| **Steps** | 1. Перейти на таб "Collection Override" 2. Выбрать коллекцию 3. Ввести custom prompt 4. Сохранить |
| **Expected Result** | Override сохранён для выбранной коллекции. Agent в этой коллекции использует кастомный prompt вместо global. |

---

#### TC-06.05: Collection Override — удаление

| Field | Value |
|-------|-------|
| **ID** | TC-06.05 |
| **Title** | Удаление collection override возвращает к global |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | Override установлен. |
| **Steps** | 1. Удалить override |
| **Expected Result** | Коллекция использует global prompt. |

---

#### TC-06.06: Пустой prompt

| Field | Value |
|-------|-------|
| **ID** | TC-06.06 |
| **Title** | Сохранение пустого prompt |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Negative |
| **Preconditions** | Global Prompt editor. |
| **Steps** | 1. Очистить весь текст prompt 2. Сохранить |
| **Expected Result** | Ошибка валидации "System prompt cannot be empty" или сброс к default. |

---

### 2.2 Agent Model (`/settings/agent`)

#### TC-06.07: Отображение Agent Configuration

| Field | Value |
|-------|-------|
| **ID** | TC-06.07 |
| **Title** | Страница Agent Configuration загружается |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Smoke |
| **Preconditions** | Backend запущен. |
| **Steps** | 1. Перейти на `/settings/agent` |
| **Expected Result** | Заголовок "Agent Configuration". Описание. Секция Model: dropdown с текущей моделью (e.g. "GPT-5"). Секция "OpenAI API Key": masked key, badge "From Environment", кнопка "Set Custom Key". Кнопка "Save Changes". |

---

#### TC-06.08: Смена модели

| Field | Value |
|-------|-------|
| **ID** | TC-06.08 |
| **Title** | Смена модели AI через dropdown |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Agent Configuration открыт. |
| **Steps** | 1. Раскрыть dropdown Model 2. Выбрать другую модель 3. Save Changes |
| **Expected Result** | Модель сохранена. Toast подтверждения. Следующие AI-операции используют новую модель. |

---

#### TC-06.09: Set Custom API Key

| Field | Value |
|-------|-------|
| **ID** | TC-06.09 |
| **Title** | Установка custom OpenAI API Key |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Agent Configuration. |
| **Steps** | 1. Нажать "Set Custom Key" 2. Ввести API key 3. Save Changes |
| **Expected Result** | Key сохранён. Badge меняется с "From Environment" на "Custom Key" (или аналогичное). Key маскирован (sk-p****...). |

---

#### TC-06.10: Невалидный API Key

| Field | Value |
|-------|-------|
| **ID** | TC-06.10 |
| **Title** | Сохранение невалидного API key |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Negative |
| **Preconditions** | — |
| **Steps** | 1. Ввести "invalid-key" 2. Save Changes |
| **Expected Result** | Ключ сохранён (валидация на уровне API не происходит немедленно). Но при следующем LLM-вызове — ошибка аутентификации OpenAI. Или: валидация при сохранении с ошибкой "Invalid API key format". |

---

#### TC-06.11: Remove Custom Key — fallback to environment

| Field | Value |
|-------|-------|
| **ID** | TC-06.11 |
| **Title** | Удаление custom key возвращает к environment variable |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | Custom key установлен. |
| **Steps** | 1. Удалить custom key (clear + save) |
| **Expected Result** | Badge: "From Environment". Система использует `OPENAI_API_KEY` из env. |

---

### 2.3 Feature Flags (`/settings/features`)

#### TC-06.12: Отображение Feature Flags

| Field | Value |
|-------|-------|
| **ID** | TC-06.12 |
| **Title** | Страница Feature Flags показывает все флаги |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Smoke |
| **Preconditions** | Backend запущен. |
| **Steps** | 1. Перейти на `/settings/features` |
| **Expected Result** | Заголовок "Feature Flags". Описание: "Enable or disable features... Changes take effect immediately." Три toggle: Web URL Ingestion, File Upload, AI Agent. Каждый с описанием и switch. Confluence Ingestion **отсутствует** (удалён из продукта). Секция "Reset to Defaults" с кнопкой "Reset". |

---

#### TC-06.13: Confluence toggle отсутствует (REMOVED)

| Field | Value |
|-------|-------|
| **ID** | TC-06.13 |
| **Title** | Toggle Confluence Ingestion отсутствует на странице Feature Flags |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Regression |
| **Preconditions** | Backend запущен. |
| **Steps** | 1. Перейти на `/settings/features` 2. Проверить список toggles |
| **Expected Result** | Toggle "Confluence Ingestion" **не отображается**. Только: Web URL Ingestion, File Upload, AI Agent. |

---

#### TC-06.14: Toggle Web URL Ingestion OFF

| Field | Value |
|-------|-------|
| **ID** | TC-06.14 |
| **Title** | Отключение Web URL Ingestion |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Web URL Ingestion включен. |
| **Steps** | 1. Toggle Web URL OFF 2. Проверить `/ingest` |
| **Expected Result** | Таб "Web URL" скрыт/disabled на Ingestion page. |

---

#### TC-06.15: Toggle File Upload OFF

| Field | Value |
|-------|-------|
| **ID** | TC-06.15 |
| **Title** | Отключение File Upload |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | File Upload включен. |
| **Steps** | 1. Toggle File Upload OFF 2. Проверить `/ingest` |
| **Expected Result** | Таб "File" скрыт/disabled. |

---

#### TC-06.16: Toggle AI Agent OFF

| Field | Value |
|-------|-------|
| **ID** | TC-06.16 |
| **Title** | Отключение AI Agent |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | AI Agent включен. |
| **Steps** | 1. Toggle AI Agent OFF 2. Открыть коллекцию 3. Перейти на `/chat` |
| **Expected Result** | Кнопка "AI Assistant" на странице коллекции скрыта/disabled. Chat page может быть ограничен или показывать сообщение что Agent отключен. |

---

#### TC-06.17: Все feature flags OFF

| Field | Value |
|-------|-------|
| **ID** | TC-06.17 |
| **Title** | Все feature flags отключены одновременно |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Edge case |
| **Preconditions** | Все флаги включены. |
| **Steps** | 1. Отключить все 3 toggle (Web URL, File Upload, AI Agent) 2. Проверить `/ingest` 3. Проверить Chat 4. Проверить Collection AI Assistant |
| **Expected Result** | Ingestion: только Manual таб остаётся (Manual не управляется feature flag). Web URL и File табы скрыты. Chat и Agent недоступны. Приложение не крашится. |

---

#### TC-06.18: Reset to Defaults

| Field | Value |
|-------|-------|
| **ID** | TC-06.18 |
| **Title** | Reset to Defaults возвращает все флаги к env-значениям |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | Некоторые флаги изменены. |
| **Steps** | 1. Нажать "Reset" 2. Подтвердить |
| **Expected Result** | Все toggles вернулись к значениям из env variables. Toast "Settings reset to defaults". |

---

#### TC-06.19: Немедленное применение

| Field | Value |
|-------|-------|
| **ID** | TC-06.19 |
| **Title** | Изменения feature flags применяются немедленно |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | — |
| **Steps** | 1. Toggle Web URL Ingestion OFF 2. **Без перезагрузки** перейти на `/ingest` 3. Проверить |
| **Expected Result** | Web URL таб уже недоступен. Не требуется перезагрузка страницы или backend restart. |

---

## 3. Coverage Matrix

| Area | Happy Path | Negative | Edge Case |
|------|:----------:|:--------:|:---------:|
| System Prompts page | TC-06.01 | — | — |
| Global Prompt | TC-06.02, TC-06.03 | TC-06.06 | — |
| Collection Override | TC-06.04, TC-06.05 | — | — |
| Agent Config page | TC-06.07 | — | — |
| Model selection | TC-06.08 | — | — |
| API Key | TC-06.09, TC-06.11 | TC-06.10 | — |
| Feature Flags page | TC-06.12 | — | — |
| Confluence (REMOVED) | TC-06.13 | — | — |
| Web URL flag | TC-06.14 | — | — |
| File flag | TC-06.15 | — | — |
| AI Agent flag | TC-06.16 | — | TC-06.17 |
| Reset | TC-06.18 | — | — |
| Immediacy | TC-06.19 | — | — |
