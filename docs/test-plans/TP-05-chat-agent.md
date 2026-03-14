# TP-05: Knowledge Chat & Agent

**Module:** Chat, Agent
**Pages:** `/chat`, Collection Agent Panel
**Priority:** High
**Last updated:** 2026-03-14

---

## 1. Overview

Standalone Chat page (`/chat`) позволяет выбрать коллекцию и общаться с AI agent. Agent использует SSE-стриминг, tool calls для поиска/модификации chunk-ов, поддерживает историю сессий и кастомизируемые system prompts.

---

## 2. Test Cases

### 2.1 Knowledge Chat Page (`/chat`)

#### TC-05.01: Отображение страницы Chat

| Field | Value |
|-------|-------|
| **ID** | TC-05.01 |
| **Title** | Страница Chat загружается с выбором коллекции |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Smoke |
| **Preconditions** | Есть хотя бы одна коллекция. |
| **Steps** | 1. Перейти на `/chat` |
| **Expected Result** | Заголовок "Knowledge Chat", подзаголовок "AI-powered analysis and management of your knowledge base". Dropdown "Select a collection..." вверху справа. Placeholder: "Select a collection to start chatting". |

---

#### TC-05.02: Выбор коллекции в dropdown

| Field | Value |
|-------|-------|
| **ID** | TC-05.02 |
| **Title** | Dropdown показывает все доступные коллекции |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Functional |
| **Preconditions** | Несколько коллекций создано. |
| **Steps** | 1. Раскрыть dropdown 2. Проверить список |
| **Expected Result** | Все коллекции перечислены. При выборе — chat-интерфейс активируется. Появляется поле ввода и история. |

---

#### TC-05.03: Chat без выбранной коллекции

| Field | Value |
|-------|-------|
| **ID** | TC-05.03 |
| **Title** | Ввод сообщения без коллекции невозможен |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative |
| **Preconditions** | Коллекция не выбрана. |
| **Steps** | 1. Попытаться ввести сообщение |
| **Expected Result** | Поле ввода disabled или скрыто. Placeholder "Select a collection to start chatting". |

---

#### TC-05.04: Переключение между коллекциями

| Field | Value |
|-------|-------|
| **ID** | TC-05.04 |
| **Title** | Смена коллекции сбрасывает контекст чата |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | Ведётся диалог с одной коллекцией. |
| **Steps** | 1. Отправить сообщение 2. Выбрать другую коллекцию 3. Проверить чат |
| **Expected Result** | История предыдущего чата очищена или переключена. Новый чат привязан к новой коллекции. |

---

### 2.2 Agent Chat — SSE Streaming

#### TC-05.05: Стриминг ответа агента

| Field | Value |
|-------|-------|
| **ID** | TC-05.05 |
| **Title** | Agent ответ отображается в реальном времени через SSE |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Functional |
| **Preconditions** | Коллекция выбрана. OpenAI доступен. |
| **Steps** | 1. Отправить сообщение 2. Наблюдать за ответом |
| **Expected Result** | Ответ появляется посимвольно/блоками (стриминг). Видны этапы: thinking → tool_call (при необходимости) → message. Нет задержки до полного ответа. |

---

#### TC-05.06: Отображение tool calls

| Field | Value |
|-------|-------|
| **ID** | TC-05.06 |
| **Title** | Tool calls агента видны пользователю |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Вопрос требует поиска по chunk-ам. |
| **Steps** | 1. Спросить "Search for chunks about authentication" |
| **Expected Result** | В потоке видно: tool_call (search_chunks), tool_result (найденные chunk-и), финальный message с результатами. Tool calls визуально выделены (collapse/expand). |

---

#### TC-05.07: Agent — прерывание стриминга

| Field | Value |
|-------|-------|
| **ID** | TC-05.07 |
| **Title** | Пользователь может остановить генерацию ответа |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | Agent генерирует длинный ответ. |
| **Steps** | 1. Отправить сообщение 2. Нажать Stop/Cancel во время генерации |
| **Expected Result** | Генерация прервана. Частичный ответ сохранён. Можно отправить новое сообщение. |

---

### 2.3 Agent Sessions

#### TC-05.08: Создание agent-сессии

| Field | Value |
|-------|-------|
| **ID** | TC-05.08 |
| **Title** | Новая agent-сессия создаётся для истории |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Коллекция выбрана. |
| **Steps** | 1. Начать новый чат 2. Отправить сообщение |
| **Expected Result** | Agent session создана. Сообщения сохраняются. При перезагрузке — история доступна. |

---

#### TC-05.09: Список agent-сессий

| Field | Value |
|-------|-------|
| **ID** | TC-05.09 |
| **Title** | Список предыдущих сессий доступен |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | Несколько agent-сессий. |
| **Steps** | 1. Открыть список сессий (sidebar или dropdown) |
| **Expected Result** | Все предыдущие сессии видны с заголовками. Клик по сессии загружает её историю. |

---

#### TC-05.10: Удаление agent-сессии

| Field | Value |
|-------|-------|
| **ID** | TC-05.10 |
| **Title** | Удаление agent-сессии |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | Есть agent-сессия. |
| **Steps** | 1. Удалить сессию |
| **Expected Result** | Сессия удалена. Не отображается в списке. |

---

### 2.4 Agent Operation Approval

#### TC-05.16: Approve agent-предложенной операции

| Field | Value |
|-------|-------|
| **ID** | TC-05.16 |
| **Title** | Подтверждение операции, предложенной agent-ом |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Agent предложил модификацию chunk-а. |
| **Steps** | 1. Попросить agent "Update chunk #1 to fix grammar" 2. Agent предлагает изменение 3. Нажать Approve |
| **Expected Result** | Операция применена. Chunk обновлён. Toast подтверждения. |

---

#### TC-05.17: Revoke agent-предложенной операции

| Field | Value |
|-------|-------|
| **ID** | TC-05.17 |
| **Title** | Отклонение операции, предложенной agent-ом |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Agent предложил модификацию. |
| **Steps** | 1. Agent предлагает изменение 2. Нажать Reject/Revoke |
| **Expected Result** | Операция отменена. Chunk не изменён. Agent получает feedback. |

---

#### TC-05.18: Rename agent session

| Field | Value |
|-------|-------|
| **ID** | TC-05.18 |
| **Title** | Переименование agent-сессии |
| **Priority** | Low |
| **Severity** | Trivial |
| **Type** | Functional |
| **Preconditions** | Agent-сессия создана. |
| **Steps** | 1. Найти сессию в списке 2. Изменить title 3. Сохранить |
| **Expected Result** | Название обновлено. Отображается в списке. |

---

### 2.5 Collection Cleaning

#### TC-05.11: Agent clean — запуск очистки

| Field | Value |
|-------|-------|
| **ID** | TC-05.11 |
| **Title** | Collection cleaning находит и удаляет низкокачественные chunk-и |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Коллекция с chunk-ами разного качества. |
| **Steps** | 1. Вызвать collection clean (через agent или API) |
| **Expected Result** | SSE-стрим: clean_progress → dirty_chunk_found → dirty_chunk_deleted → clean_complete. Итог: количество удалённых chunk-ов. |

---

#### TC-05.12: Agent clean — пустая коллекция

| Field | Value |
|-------|-------|
| **ID** | TC-05.12 |
| **Title** | Clean на пустой коллекции |
| **Priority** | Low |
| **Severity** | Trivial |
| **Type** | Edge case |
| **Preconditions** | Коллекция без chunk-ов. |
| **Steps** | 1. Запустить clean |
| **Expected Result** | Clean завершается мгновенно. 0 dirty chunks found. |

---

### 2.5 Error Handling

#### TC-05.13: OpenAI API недоступен

| Field | Value |
|-------|-------|
| **ID** | TC-05.13 |
| **Title** | Ошибка при недоступном OpenAI |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative |
| **Preconditions** | OpenAI API key невалиден или сервис недоступен. |
| **Steps** | 1. Отправить сообщение в чат |
| **Expected Result** | Понятная ошибка: "LLM service unavailable" или аналогичное. Нет зависания. Кнопка Send снова доступна. |

---

#### TC-05.14: Rate limiting

| Field | Value |
|-------|-------|
| **ID** | TC-05.14 |
| **Title** | Множественные быстрые запросы — rate limit |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Edge case |
| **Preconditions** | — |
| **Steps** | 1. Отправить 10+ сообщений подряд быстро |
| **Expected Result** | После превышения лимита — ошибка 429 "Rate limited". Сообщение пользователю о необходимости подождать. |

---

#### TC-05.15: Очень длинное сообщение

| Field | Value |
|-------|-------|
| **ID** | TC-05.15 |
| **Title** | Отправка сообщения > 10000 символов |
| **Priority** | Low |
| **Severity** | Minor |
| **Type** | Edge case |
| **Preconditions** | Chat активен. |
| **Steps** | 1. Вставить текст 10000+ символов 2. Отправить |
| **Expected Result** | Либо обрезается с предупреждением, либо обрабатывается корректно. Нет crash. |

---

## 3. Coverage Matrix

| Area | Happy Path | Negative | Edge Case |
|------|:----------:|:--------:|:---------:|
| Chat page | TC-05.01, TC-05.02 | TC-05.03 | TC-05.04 |
| Agent streaming | TC-05.05, TC-05.06 | TC-05.13 | TC-05.07 |
| Agent sessions | TC-05.08, TC-05.09, TC-05.10 | — | — |
| Collection clean | TC-05.11 | — | TC-05.12 |
| Error handling | — | TC-05.13 | TC-05.14, TC-05.15 |
