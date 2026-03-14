# TP-07: End-to-End & Cross-Cutting Scenarios

**Module:** Cross-module
**Priority:** Critical
**Last updated:** 2026-03-14

---

## 1. Overview

Сквозные сценарии, покрывающие полный lifecycle контента (Ingest → Edit → Preview → Publish → Search → Chat), а также cross-cutting concerns: error handling, accessibility, performance, security.

---

## 2. Test Cases

### 2.1 E2E Flows

#### TC-07.01: Full Lifecycle — Manual → Publish → Search → Chat

| Field | Value |
|-------|-------|
| **ID** | TC-07.01 |
| **Title** | Полный цикл: ручной инжест → редактирование → publish → поиск → чат |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | E2E |
| **Preconditions** | Пустая система или существующая коллекция. Backend, Redis, Qdrant, OpenAI — всё доступно. |
| **Steps** | 1. Создать коллекцию "E2E Test" через `/collections` → New Collection 2. Перейти на `/ingest` → Manual 3. Ввести текст: "RAGler is a knowledge management system. It supports ingestion, chunking, and publishing." 4. Start Processing (LLM chunking) 5. В Session Editor: проверить что chunk-и созданы 6. Отредактировать один chunk (добавить текст) 7. Нажать Preview 8. Нажать Publish → выбрать "E2E Test" коллекцию 9. Перейти в коллекцию → All Chunks → проверить chunk-и 10. Перейти в Chat tab → спросить "What is RAGler?" 11. Проверить ответ с citations |
| **Expected Result** | Каждый шаг проходит без ошибок. Финальный ответ содержит информацию из инжестированного текста. Citations ссылаются на опубликованные chunk-и. |

---

#### TC-07.02: Full Lifecycle — File Upload → Publish

| Field | Value |
|-------|-------|
| **ID** | TC-07.02 |
| **Title** | Полный цикл с файловым инжестом |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | E2E |
| **Preconditions** | PDF-файл с текстовым содержимым. Существующая коллекция. |
| **Steps** | 1. Ingest → File → upload PDF 2. Start Processing 3. Session Editor: проверить chunk-и 4. Split один chunk 5. Merge два других 6. Preview → Publish в коллекцию 7. Collection → Documents → проверить документ 8. All Chunks → проверить chunk-и 9. Chat → задать вопрос по содержимому файла |
| **Expected Result** | PDF обработан. Split/merge применены. Publish прошёл. Документ виден в Documents. Chat отвечает на основе содержимого PDF. |

---

#### TC-07.03: Full Lifecycle — Web URL → Publish

| Field | Value |
|-------|-------|
| **ID** | TC-07.03 |
| **Title** | Полный цикл с web-инжестом |
| **Priority** | High |
| **Severity** | Major |
| **Type** | E2E |
| **Preconditions** | Доступная публичная веб-страница. |
| **Steps** | 1. Ingest → Web URL → ввести URL 2. Start Processing 3. Review chunks → edit 4. Preview → Publish 5. Verify in collection |
| **Expected Result** | Текст извлечён из веб-страницы. Chunk-и опубликованы. |

---

#### TC-07.04: Atomic Replacement — повторный publish того же источника

| Field | Value |
|-------|-------|
| **ID** | TC-07.04 |
| **Title** | Повторный publish из того же источника заменяет старые chunk-и |
| **Priority** | Critical |
| **Severity** | Critical |
| **Type** | E2E / Business Rule |
| **Preconditions** | Коллекция с published chunk-ами из Manual source. |
| **Steps** | 1. Запомнить chunk-и в коллекции (count = N) 2. Ingest → Manual → тот же текст (или модифицированный) 3. Process → Edit → Preview → Publish в ту же коллекцию 4. Проверить chunk-и коллекции |
| **Expected Result** | Старые chunk-и из этого source удалены. Новые chunk-и добавлены. Нет дублирования. Total chunks может измениться. |

---

#### TC-07.05: Multiple sources в одной коллекции

| Field | Value |
|-------|-------|
| **ID** | TC-07.05 |
| **Title** | Публикация из разных источников в одну коллекцию |
| **Priority** | High |
| **Severity** | Major |
| **Type** | E2E |
| **Preconditions** | Коллекция создана. |
| **Steps** | 1. Ingest Manual text → Publish в коллекцию 2. Ingest Web URL → Publish в ту же коллекцию 3. Ingest File → Publish в ту же коллекцию 4. Проверить коллекцию |
| **Expected Result** | Коллекция содержит chunk-и из всех 3 источников. Documents tab показывает 3 документа. Фильтр по sourceType работает. Chat ищет по всем chunk-ам. |

---

#### TC-07.06: Direct editing → Search verification

| Field | Value |
|-------|-------|
| **ID** | TC-07.06 |
| **Title** | Прямое редактирование chunk-а немедленно отражается в поиске |
| **Priority** | High |
| **Severity** | Major |
| **Type** | E2E |
| **Preconditions** | Коллекция с опубликованными chunk-ами. |
| **Steps** | 1. Отредактировать chunk в All Chunks (добавить уникальное слово "xyzunique123") 2. Перейти в Chat 3. Спросить "xyzunique123" |
| **Expected Result** | Chat находит обновлённый chunk. Citation ссылается на него. |

---

### 2.2 Cross-Cutting: Error Handling

#### TC-07.07: Backend restart recovery

| Field | Value |
|-------|-------|
| **ID** | TC-07.07 |
| **Title** | UI восстанавливается после перезапуска backend |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Resilience |
| **Preconditions** | Приложение работает нормально. |
| **Steps** | 1. Выполнить действие (открыть коллекцию) 2. Остановить backend 3. Попробовать навигацию → зафиксировать ошибки 4. Запустить backend 5. Обновить страницу |
| **Expected Result** | При недоступном backend — понятные error messages, не белый экран. После restart — всё работает. Published data не потерян (Qdrant persistent). Draft сессии могут быть потеряны (Redis). |

---

#### TC-07.08: Redis unavailable — degraded mode

| Field | Value |
|-------|-------|
| **ID** | TC-07.08 |
| **Title** | Поведение при недоступном Redis |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative / Resilience |
| **Preconditions** | Redis остановлен. |
| **Steps** | 1. Открыть Dashboard → проверить System Status 2. Попробовать Ingest 3. Попробовать открыть Sessions |
| **Expected Result** | Dashboard: System Status ≠ Operational (readiness check fails). Ingest: ошибка "Session storage unavailable". Sessions list: ошибка или пустой. Collections и Chat продолжают работать (данные в Qdrant). |

---

#### TC-07.09: Qdrant unavailable

| Field | Value |
|-------|-------|
| **ID** | TC-07.09 |
| **Title** | Поведение при недоступном Qdrant |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative / Resilience |
| **Preconditions** | Qdrant остановлен. |
| **Steps** | 1. Dashboard → System Status 2. Collections → List 3. Publish session 4. Chat |
| **Expected Result** | Readiness fails. Collections list может вернуть ошибку. Publish fails: "Vector store unavailable". Chat: "Search service unavailable". Sessions (Redis) продолжают работать. |

---

### 2.3 Cross-Cutting: Navigation & UX

#### TC-07.10: Deep link — прямой доступ по URL

| Field | Value |
|-------|-------|
| **ID** | TC-07.10 |
| **Title** | Прямой переход по URL работает для всех страниц |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | — |
| **Steps** | 1. Открыть `/dashboard` → работает 2. `/ingest` → работает 3. `/sessions` → работает 4. `/collections` → работает 5. `/collections/:valid-id` → работает 6. `/chat` → работает 7. `/settings/prompts` → работает 8. `/settings/agent` → работает 9. `/settings/features` → работает |
| **Expected Result** | Все URL загружаются корректно при прямом доступе (без навигации через sidebar). |

---

#### TC-07.11: 404 — несуществующий маршрут

| Field | Value |
|-------|-------|
| **ID** | TC-07.11 |
| **Title** | Несуществующий URL показывает 404 |
| **Priority** | Low |
| **Severity** | Minor |
| **Type** | Negative |
| **Preconditions** | — |
| **Steps** | 1. Перейти на `/nonexistent-page` |
| **Expected Result** | 404 страница или redirect на Dashboard. Не белый экран. |

---

#### TC-07.12: Browser Back/Forward

| Field | Value |
|-------|-------|
| **ID** | TC-07.12 |
| **Title** | Кнопки браузера Back/Forward работают |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | UI |
| **Preconditions** | Навигация по нескольким страницам. |
| **Steps** | 1. Dashboard → Ingest → Sessions → Back → Back → Forward |
| **Expected Result** | Browser history корректна. Каждая страница загружается правильно. |

---

#### TC-07.13: Notification system (Toast)

| Field | Value |
|-------|-------|
| **ID** | TC-07.13 |
| **Title** | Toast-уведомления появляются при операциях |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | UI |
| **Preconditions** | — |
| **Steps** | 1. Создать коллекцию → toast 2. Удалить сессию → toast 3. Publish → toast 4. Ошибка → error toast |
| **Expected Result** | Toasts появляются в notification area (alt+T). Успех: зелёный/нейтральный цвет. Ошибка: красный. Toasts автоматически исчезают через несколько секунд. |

---

### 2.4 Cross-Cutting: Security

#### TC-07.14: XSS protection — вредоносный контент

| Field | Value |
|-------|-------|
| **ID** | TC-07.14 |
| **Title** | HTML/JS injection не исполняется |
| **Priority** | Critical |
| **Severity** | Critical |
| **Type** | Security |
| **Preconditions** | — |
| **Steps** | 1. Ingest Manual: `<script>alert('xss')</script><img onerror="alert(1)" src=x>` 2. Process 3. Открыть Session Editor 4. Publish 5. Открыть chunk в Collection |
| **Expected Result** | Скрипт НЕ исполняется. HTML отображается как plain text. Нет alert popup. Chunk отображается безопасно. |

---

#### TC-07.15: API key masking

| Field | Value |
|-------|-------|
| **ID** | TC-07.15 |
| **Title** | API key маскирован в UI |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Security |
| **Preconditions** | OpenAI API key установлен. |
| **Steps** | 1. Открыть `/settings/agent` 2. Проверить отображение ключа |
| **Expected Result** | Ключ маскирован: `sk-p****...`. Полный ключ не виден. Нельзя скопировать полный ключ из UI. |

---

### 2.5 Cross-Cutting: Performance

#### TC-07.16: Время загрузки страниц

| Field | Value |
|-------|-------|
| **ID** | TC-07.16 |
| **Title** | Страницы загружаются в приемлемое время |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Performance |
| **Preconditions** | Система под нормальной нагрузкой. |
| **Steps** | 1. Замерить время загрузки Dashboard 2. Sessions 3. Collections 4. Collection Detail с 100+ chunks |
| **Expected Result** | Dashboard: < 2с. Sessions/Collections list: < 2с. Collection detail: < 3с. All Chunks с 100 chunk-ами: < 3с (может быть paginated). |

---

#### TC-07.17: Большая коллекция — All Chunks pagination

| Field | Value |
|-------|-------|
| **ID** | TC-07.17 |
| **Title** | All Chunks с большим числом chunk-ов |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Performance / Edge case |
| **Preconditions** | Коллекция с 500+ chunk-ами. |
| **Steps** | 1. Открыть All Chunks tab 2. Скроллить / paginate |
| **Expected Result** | Pagination или infinite scroll. Страница не зависает. Фильтры работают. |

---

### 2.6 Health Checks (API verification)

#### TC-07.18: Liveness check

| Field | Value |
|-------|-------|
| **ID** | TC-07.18 |
| **Title** | GET /api/health/liveness возвращает ok |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Smoke / API |
| **Preconditions** | Backend запущен. |
| **Steps** | 1. GET `http://localhost:3000/api/health/liveness` |
| **Expected Result** | HTTP 200. Body: `{"status": "ok"}`. |

---

#### TC-07.19: Readiness check — все зависимости ok

| Field | Value |
|-------|-------|
| **ID** | TC-07.19 |
| **Title** | GET /api/health/readiness с healthy dependencies |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Smoke / API |
| **Preconditions** | Redis и Qdrant запущены. |
| **Steps** | 1. GET `http://localhost:3000/api/health/readiness` |
| **Expected Result** | HTTP 200. Body содержит `status: "ok"` и checks для Redis и Qdrant. |

---

#### TC-07.20: Readiness check — dependency down

| Field | Value |
|-------|-------|
| **ID** | TC-07.20 |
| **Title** | Readiness fail при недоступной зависимости |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative / API |
| **Preconditions** | Redis остановлен. |
| **Steps** | 1. GET `/api/health/readiness` |
| **Expected Result** | HTTP 503. Body указывает на failed check (Redis). |

---

## 3. Coverage Matrix

| Area | Happy Path | Negative | Edge Case |
|------|:----------:|:--------:|:---------:|
| E2E Manual | TC-07.01 | — | — |
| E2E File | TC-07.02 | — | — |
| E2E Web | TC-07.03 | — | — |
| Atomic Replace | TC-07.04 | — | — |
| Multi-source | TC-07.05 | — | — |
| Direct Edit→Search | TC-07.06 | — | — |
| Backend restart | — | TC-07.07 | — |
| Redis down | — | TC-07.08 | — |
| Qdrant down | — | TC-07.09 | — |
| Deep links | TC-07.10 | TC-07.11 | — |
| Browser nav | TC-07.12 | — | — |
| Toasts | TC-07.13 | — | — |
| XSS | — | — | TC-07.14 |
| API Key security | TC-07.15 | — | — |
| Performance | TC-07.16 | — | TC-07.17 |
| Health checks | TC-07.18, TC-07.19 | TC-07.20 | — |
