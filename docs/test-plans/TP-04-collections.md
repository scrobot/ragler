# TP-04: Collections

**Module:** Collections
**Pages:** `/collections`, `/collections/:id`
**Priority:** Critical
**Last updated:** 2026-03-14

---

## 1. Overview

Модуль Collections управляет опубликованными базами знаний. Включает: CRUD коллекций, вкладки Overview / Documents / All Chunks / Chat, прямое редактирование опубликованных chunk-ов, фильтрацию, кнопку AI Assistant.

---

## 2. Test Cases

### 2.1 Collections List (`/collections`)

#### TC-04.01: Отображение списка коллекций

| Field | Value |
|-------|-------|
| **ID** | TC-04.01 |
| **Title** | Страница Collections показывает все коллекции |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Smoke |
| **Preconditions** | Есть хотя бы 1 коллекция. |
| **Steps** | 1. Перейти на `/collections` |
| **Expected Result** | Заголовок "Collections", подзаголовок "Manage your knowledge collections." Таблица: Name, Description, Created By, Created At, Actions (edit icon + delete icon). Кнопка "+ New Collection". |

---

#### TC-04.02: Создание новой коллекции

| Field | Value |
|-------|-------|
| **ID** | TC-04.02 |
| **Title** | Создание коллекции через "+ New Collection" |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Functional |
| **Preconditions** | Страница Collections загружена. |
| **Steps** | 1. Нажать "+ New Collection" 2. Ввести Name: "Test Collection ABC" 3. Ввести Description: "Test description" 4. Подтвердить |
| **Expected Result** | Коллекция создана. Появилась в таблице с правильным именем и описанием. Toast "Collection created". |

---

#### TC-04.03: Создание коллекции без имени

| Field | Value |
|-------|-------|
| **ID** | TC-04.03 |
| **Title** | Невозможно создать коллекцию без имени |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative |
| **Preconditions** | Модальное окно создания открыто. |
| **Steps** | 1. Оставить Name пустым 2. Подтвердить |
| **Expected Result** | Ошибка валидации. Коллекция не создаётся. |

---

#### TC-04.04: Создание коллекции с дублирующим именем

| Field | Value |
|-------|-------|
| **ID** | TC-04.04 |
| **Title** | Дубликат имени коллекции — ошибка 409 |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative |
| **Preconditions** | Коллекция "QA Test Collection" уже существует. |
| **Steps** | 1. Создать коллекцию с именем "QA Test Collection" |
| **Expected Result** | Ошибка: "Collection name already exists". Коллекция не создана. |

---

#### TC-04.05: Удаление коллекции

| Field | Value |
|-------|-------|
| **ID** | TC-04.05 |
| **Title** | Удаление коллекции через иконку корзины |
| **Priority** | Critical |
| **Severity** | Critical |
| **Type** | Functional |
| **Preconditions** | Есть коллекция с chunk-ами. |
| **Steps** | 1. Нажать иконку корзины 2. Подтвердить удаление |
| **Expected Result** | Коллекция удалена. Все chunk-и в ней удалены из Qdrant. Строка исчезает из таблицы. Toast "Collection deleted". |

---

#### TC-04.06: Переход в Collection Detail

| Field | Value |
|-------|-------|
| **ID** | TC-04.06 |
| **Title** | Клик по иконке edit ведёт на страницу коллекции |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Есть коллекция. |
| **Steps** | 1. Нажать иконку edit (стрелка) в Actions |
| **Expected Result** | Redirect на `/collections/:id`. |

---

#### TC-04.07: Пустой список коллекций

| Field | Value |
|-------|-------|
| **ID** | TC-04.07 |
| **Title** | Пустое состояние при нулевых коллекциях |
| **Priority** | Low |
| **Severity** | Trivial |
| **Type** | Edge case |
| **Preconditions** | Все коллекции удалены. |
| **Steps** | 1. Открыть `/collections` |
| **Expected Result** | Пустая таблица или placeholder. Кнопка "+ New Collection" доступна. |

---

### 2.2 Collection Detail — Overview Tab

#### TC-04.08: Overview отображает метрики

| Field | Value |
|-------|-------|
| **ID** | TC-04.08 |
| **Title** | Overview tab показывает статистику коллекции |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Коллекция с chunk-ами. |
| **Steps** | 1. Открыть коллекцию 2. Проверить таб Overview |
| **Expected Result** | Карточки: Total Chunks (число), Documents (число), Avg Quality (число или N/A), Source Types (число). Секция "Collection Details": Created by, Created at. Секция "Sources Breakdown". Кнопка "AI Assistant" вверху. Кнопка refresh. |

---

#### TC-04.09: Overview — пустая коллекция

| Field | Value |
|-------|-------|
| **ID** | TC-04.09 |
| **Title** | Overview для коллекции без chunk-ов |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Edge case |
| **Preconditions** | Пустая коллекция. |
| **Steps** | 1. Открыть пустую коллекцию |
| **Expected Result** | Total Chunks: 0, Documents: 0, Avg Quality: N/A. Sources Breakdown пуст или placeholder. |

---

### 2.3 Collection Detail — Documents Tab

#### TC-04.10: Documents показывает группировку по документам

| Field | Value |
|-------|-------|
| **ID** | TC-04.10 |
| **Title** | Documents tab отображает список документов-источников |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Коллекция с chunk-ами из файла. |
| **Steps** | 1. Перейти на таб "Documents" |
| **Expected Result** | Список документов. Каждый: имя файла, описание, badges (chunk count, source type, quality score), дата инжеста. Документы сгруппированы по source_id. |

---

#### TC-04.11: Documents — клик по документу

| Field | Value |
|-------|-------|
| **ID** | TC-04.11 |
| **Title** | Клик по документу фильтрует chunk-и этого документа |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | Несколько документов в коллекции. |
| **Steps** | 1. Кликнуть по документу в Documents tab |
| **Expected Result** | Переход на All Chunks с фильтром по source_id данного документа. Или раскрытие списка chunk-ов документа. |

---

### 2.4 Collection Detail — All Chunks Tab

#### TC-04.12: All Chunks — отображение

| Field | Value |
|-------|-------|
| **ID** | TC-04.12 |
| **Title** | All Chunks tab показывает опубликованные chunk-и |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Functional |
| **Preconditions** | Коллекция с chunk-ами. |
| **Steps** | 1. Перейти на таб "All Chunks" |
| **Expected Result** | Секция "Filters" (сворачиваемая). Список chunk-ов с: номер (#1, #2...), тип badge (knowledge, glossary...), heading path, текст контента, теги (badges), размер (chars). Чекбоксы для выбора. |

---

#### TC-04.13: Filters — раскрытие и применение

| Field | Value |
|-------|-------|
| **ID** | TC-04.13 |
| **Title** | Фильтры chunk-ов работают корректно |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Коллекция с chunk-ами разных типов/источников. |
| **Steps** | 1. Раскрыть "Filters" 2. Установить фильтр по sourceType 3. Установить фильтр по tags 4. Проверить результаты |
| **Expected Result** | Список chunk-ов отфильтрован. Фильтры: Source Type, Source ID, Quality Score range, Tags. Комбинирование фильтров работает (AND-логика). |

---

#### TC-04.14: Редактирование опубликованного chunk-а

| Field | Value |
|-------|-------|
| **ID** | TC-04.14 |
| **Title** | Inline-edit текста опубликованного chunk-а |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Functional |
| **Preconditions** | All Chunks tab. |
| **Steps** | 1. Нажать Edit на chunk-е 2. Изменить текст 3. Сохранить |
| **Expected Result** | Текст обновлён немедленно. Изменение отражается в поиске. Toast подтверждения. |

---

#### TC-04.15: Split опубликованного chunk-а

| Field | Value |
|-------|-------|
| **ID** | TC-04.15 |
| **Title** | Split работает на опубликованных chunk-ах |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Chunk с достаточным текстом. |
| **Steps** | 1. Split chunk 2. Проверить два новых chunk-а |
| **Expected Result** | Chunk разделён. Оба видны в списке. Поиск находит оба. |

---

#### TC-04.16: Merge опубликованных chunk-ов

| Field | Value |
|-------|-------|
| **ID** | TC-04.16 |
| **Title** | Merge нескольких опубликованных chunk-ов |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | 2+ chunk-а. |
| **Steps** | 1. Выбрать 2 chunk-а 2. Merge |
| **Expected Result** | Chunk-и объединены. Результат один chunk с комбинированным текстом. |

---

#### TC-04.17: Delete опубликованного chunk-а

| Field | Value |
|-------|-------|
| **ID** | TC-04.17 |
| **Title** | Удаление chunk-а из коллекции |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | All Chunks tab. |
| **Steps** | 1. Удалить chunk 2. Проверить список |
| **Expected Result** | Chunk удалён. Не находится в поиске. Счётчик уменьшен. **Удаление необратимо.** |

---

#### TC-04.18: Пустой chunk content при edit

| Field | Value |
|-------|-------|
| **ID** | TC-04.18 |
| **Title** | Сохранение пустого текста chunk-а |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Negative |
| **Preconditions** | Chunk в режиме редактирования. |
| **Steps** | 1. Очистить весь текст 2. Сохранить |
| **Expected Result** | Ошибка: "Chunk content cannot be empty". Сохранение блокировано. |

---

### 2.5 Collection Detail — Chat Tab

#### TC-04.19: Chat tab — отображение

| Field | Value |
|-------|-------|
| **ID** | TC-04.19 |
| **Title** | Chat tab показывает RAG-интерфейс |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Коллекция открыта. |
| **Steps** | 1. Перейти на таб "Chat" |
| **Expected Result** | Заголовок "Knowledge Chat", badge "RAG". Пустое состояние: "Ask questions about your knowledge base. Responses are grounded in your collection's chunks." Поле ввода внизу. |

---

#### TC-04.20: Chat — отправка вопроса и получение ответа

| Field | Value |
|-------|-------|
| **ID** | TC-04.20 |
| **Title** | RAG-чат возвращает ответ с цитатами |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Functional |
| **Preconditions** | Коллекция с chunk-ами. OpenAI API доступен. |
| **Steps** | 1. Ввести вопрос, релевантный контенту коллекции 2. Отправить |
| **Expected Result** | Ответ от AI. Citations (ссылки на chunk-и) с relevance scores. Ответ грounded в контенте коллекции. |

---

#### TC-04.21: Chat — follow-up вопрос

| Field | Value |
|-------|-------|
| **ID** | TC-04.21 |
| **Title** | Контекст сохраняется между сообщениями |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Первый ответ получен. |
| **Steps** | 1. Задать follow-up вопрос, ссылающийся на предыдущий ответ |
| **Expected Result** | AI учитывает контекст предыдущего сообщения. Ответ связный. |

---

#### TC-04.22: Chat — пустой вопрос

| Field | Value |
|-------|-------|
| **ID** | TC-04.22 |
| **Title** | Отправка пустого сообщения блокирована |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Negative |
| **Preconditions** | Chat tab открыт. |
| **Steps** | 1. Нажать Send без ввода текста |
| **Expected Result** | Кнопка Send disabled или ничего не происходит. |

---

#### TC-04.23: Chat — нерелевантный вопрос

| Field | Value |
|-------|-------|
| **ID** | TC-04.23 |
| **Title** | Вопрос не по теме коллекции |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Edge case |
| **Preconditions** | Коллекция о deBridge. |
| **Steps** | 1. Спросить "What is the capital of France?" |
| **Expected Result** | AI отвечает что информация не найдена в knowledge base, или даёт ответ с пустыми citations. |

---

### 2.6 AI Assistant

#### TC-04.24: Открытие AI Assistant

| Field | Value |
|-------|-------|
| **ID** | TC-04.24 |
| **Title** | Кнопка AI Assistant открывает agent-интерфейс |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Collection detail открыт. AI Agent feature flag включен. |
| **Steps** | 1. Нажать кнопку "AI Assistant" |
| **Expected Result** | Открывается панель/модальное окно Agent Chat. Можно вести диалог с агентом. Agent видит chunk-и коллекции. |

---

#### TC-04.25: AI Assistant — анализ качества

| Field | Value |
|-------|-------|
| **ID** | TC-04.25 |
| **Title** | Agent анализирует качество chunk-ов |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | AI Assistant открыт. Коллекция с chunk-ами. |
| **Steps** | 1. Попросить "Analyze quality of chunks in this collection" |
| **Expected Result** | Agent выполняет tool calls (search, read). SSE-поток: thinking → tool_call → tool_result → message. Результат: оценка качества, рекомендации. |

---

#### TC-04.26: AI Assistant — feature flag отключен

| Field | Value |
|-------|-------|
| **ID** | TC-04.26 |
| **Title** | AI Assistant недоступен при отключённом feature flag |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | Feature flag "AI Agent" отключен. |
| **Steps** | 1. Открыть коллекцию |
| **Expected Result** | Кнопка "AI Assistant" отсутствует или disabled. |

---

### 2.7 Chunk Quality Score & Reorder

#### TC-04.29: Обновление quality score chunk-а

| Field | Value |
|-------|-------|
| **ID** | TC-04.29 |
| **Title** | Обновление quality score опубликованного chunk-а |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | Chunk в коллекции. |
| **Steps** | 1. Найти chunk в All Chunks 2. Изменить quality score (если UI позволяет) 3. Сохранить |
| **Expected Result** | Quality score обновлён. Avg Quality в Overview пересчитан. Фильтр по quality работает с новым значением. |

---

#### TC-04.30: Reorder chunk-ов

| Field | Value |
|-------|-------|
| **ID** | TC-04.30 |
| **Title** | Изменение порядка chunk-ов в коллекции |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | 3+ chunk-ов в коллекции. |
| **Steps** | 1. Drag-and-drop chunk или использовать API reorder 2. Проверить новый порядок |
| **Expected Result** | Порядок chunk-ов изменён. Номера (#1, #2...) отражают новый порядок. |

---

### 2.8 Refresh и несуществующая коллекция

#### TC-04.27: Refresh кнопка

| Field | Value |
|-------|-------|
| **ID** | TC-04.27 |
| **Title** | Кнопка refresh обновляет данные коллекции |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | Collection detail открыт. |
| **Steps** | 1. Нажать кнопку refresh (🔄) рядом с заголовком |
| **Expected Result** | Данные коллекции перезагружаются. Счётчики обновляются. |

---

#### TC-04.28: Несуществующая коллекция

| Field | Value |
|-------|-------|
| **ID** | TC-04.28 |
| **Title** | Открытие несуществующего collection ID |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Negative |
| **Preconditions** | — |
| **Steps** | 1. Перейти на `/collections/non-existent-uuid` |
| **Expected Result** | Ошибка 404. Сообщение "Collection not found" или redirect. |

---

## 3. Coverage Matrix

| Area | Happy Path | Negative | Edge Case |
|------|:----------:|:--------:|:---------:|
| Collections List | TC-04.01, TC-04.06 | — | TC-04.07 |
| Create Collection | TC-04.02 | TC-04.03, TC-04.04 | — |
| Delete Collection | TC-04.05 | — | — |
| Overview Tab | TC-04.08 | — | TC-04.09 |
| Documents Tab | TC-04.10, TC-04.11 | — | — |
| All Chunks List | TC-04.12 | — | — |
| Chunk Filters | TC-04.13 | — | — |
| Chunk Edit | TC-04.14 | TC-04.18 | — |
| Chunk Split | TC-04.15 | — | — |
| Chunk Merge | TC-04.16 | — | — |
| Chunk Delete | TC-04.17 | — | — |
| Chat | TC-04.19, TC-04.20, TC-04.21 | TC-04.22 | TC-04.23 |
| AI Assistant | TC-04.24, TC-04.25 | — | TC-04.26 |
| Navigation | TC-04.27 | TC-04.28 | — |
