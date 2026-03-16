# TP-02: Ingestion

**Module:** Ingestion
**Page:** `/ingest`
**Priority:** Critical
**Last updated:** 2026-03-14

---

## 1. Overview

Страница Ingestion — точка входа контента в систему. Три таба источников: Web URL, Manual, File. Каждый таб имеет свои поля ввода. Общие элементы: Chunking Settings (LLM / Character), кнопка "Start Processing". Результат — создание draft-сессии с chunk-ами.

> **Note:** Confluence ingestion был удалён из продукта. Таб Confluence отсутствует в UI, strategy удалена из backend, sourceType enum: `web | manual | file`.

---

## 2. Test Cases

### 2.1 Общие / UI

#### TC-02.01: Отображение страницы Ingestion

| Field | Value |
|-------|-------|
| **ID** | TC-02.01 |
| **Title** | Страница Ingestion загружается с тремя табами |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Smoke |
| **Preconditions** | Backend запущен. |
| **Steps** | 1. Перейти на `/ingest` |
| **Expected Result** | Заголовок "Add Knowledge Source", подзаголовок "Import content to create a new editing session." Три таба: Web URL (активный по умолчанию), Manual, File. Таб Confluence **отсутствует**. Кнопка "Start Processing" внизу. |

---

#### TC-02.02: Переключение между табами

| Field | Value |
|-------|-------|
| **ID** | TC-02.02 |
| **Title** | Клик по каждому табу корректно переключает форму |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Страница `/ingest` загружена. |
| **Steps** | 1. Кликнуть "Web URL" — проверить поля 2. Кликнуть "Manual" — проверить textarea 3. Кликнуть "File" — проверить drag-and-drop зону |
| **Expected Result** | Web URL: поле "Web Page URL". Manual: textarea "Content". File: зона drag-and-drop с подписью "Drop a file here or click to browse". Активный таб визуально выделен. Таб Confluence **отсутствует**. |

---

#### TC-02.03: Chunking Settings — переключение LLM / Character

| Field | Value |
|-------|-------|
| **ID** | TC-02.03 |
| **Title** | Chunking Settings позволяет выбрать метод чанкинга |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Любой таб на `/ingest`. |
| **Steps** | 1. Раскрыть секцию "Chunking Settings" (клик по стрелке) 2. Проверить что по умолчанию выбран "LLM" 3. Переключить на "Character" 4. Проверить появление полей Chunk Size и Overlap |
| **Expected Result** | По умолчанию badge "LLM". При переключении на Character появляются числовые поля: Chunk Size (default 1000), Overlap (default 200). При переключении обратно на LLM поля исчезают. |

---

#### TC-02.04: Character chunking — валидация границ

| Field | Value |
|-------|-------|
| **ID** | TC-02.04 |
| **Title** | Chunk Size и Overlap валидируют допустимые диапазоны |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Validation / Edge case |
| **Preconditions** | Chunking Settings → Character. |
| **Steps** | 1. Ввести Chunk Size = 50 (ниже минимума 100) → попробовать Submit 2. Ввести Chunk Size = 15000 (выше максимума 10000) 3. Ввести Overlap = -1 4. Ввести Overlap > Chunk Size |
| **Expected Result** | Форма показывает ошибки валидации. Сабмит блокируется. Chunk Size: 100–10000. Overlap: 0–2000. Overlap не может превышать Chunk Size. |

---

### 2.2 Confluence (REMOVED — regression check)

#### TC-02.05: Confluence — таб отсутствует в UI

| Field | Value |
|-------|-------|
| **ID** | TC-02.05 |
| **Title** | Таб Confluence полностью удалён из Ingestion UI |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Regression |
| **Preconditions** | Backend запущен. |
| **Steps** | 1. Перейти на `/ingest` 2. Проверить список табов |
| **Expected Result** | Только три таба: Web URL, Manual, File. Таб "Confluence" **не отображается**. |

---

#### TC-02.06: Confluence — API endpoint отклоняет запросы

| Field | Value |
|-------|-------|
| **ID** | TC-02.06 |
| **Title** | POST /api/ingest/confluence возвращает 404 или 400 |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Regression / API |
| **Preconditions** | — |
| **Steps** | 1. Отправить POST запрос на `/api/ingest/confluence` с валидными данными |
| **Expected Result** | Ответ 404 (Not Found) или 400 (Bad Request). Endpoint не обрабатывает запросы. SourceType "confluence" отклоняется Zod-валидацией. |

---

### 2.3 Web URL Ingestion

#### TC-02.13: Web URL — успешный инжест

| Field | Value |
|-------|-------|
| **ID** | TC-02.13 |
| **Title** | Инжест публичной веб-страницы создаёт сессию |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Functional |
| **Preconditions** | Backend запущен. Целевая страница доступна. |
| **Steps** | 1. Таб "Web URL" 2. Ввести `https://example.com` 3. Start Processing |
| **Expected Result** | Индикатор загрузки. Redirect на Session Editor. Сессия создана с типом "web". Chunk-и содержат текст со страницы. |

---

#### TC-02.14: Web URL — пустое поле

| Field | Value |
|-------|-------|
| **ID** | TC-02.14 |
| **Title** | Сабмит без URL показывает валидационную ошибку |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative |
| **Preconditions** | Таб Web URL. |
| **Steps** | 1. Оставить поле URL пустым 2. Start Processing |
| **Expected Result** | Ошибка валидации. Запрос не отправляется. |

---

#### TC-02.15: Web URL — недоступная страница

| Field | Value |
|-------|-------|
| **ID** | TC-02.15 |
| **Title** | Таймаут при недоступной странице |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative |
| **Preconditions** | URL ведёт на несуществующий хост. |
| **Steps** | 1. Ввести `https://this-domain-does-not-exist-12345.com` 2. Start Processing |
| **Expected Result** | После таймаута (30с) — ошибка "Fetch timeout" или "URL unreachable". Кнопка снова доступна. |

---

#### TC-02.16: Web URL — невалидный формат

| Field | Value |
|-------|-------|
| **ID** | TC-02.16 |
| **Title** | Невалидный URL формат отклоняется |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Negative |
| **Preconditions** | Таб Web URL. |
| **Steps** | 1. Ввести `not a url` 2. Start Processing |
| **Expected Result** | Ошибка валидации: "URL is malformed" или аналогичное. |

---

#### TC-02.17: Web URL — feature flag отключен

| Field | Value |
|-------|-------|
| **ID** | TC-02.17 |
| **Title** | Таб Web URL скрыт при отключённом feature flag |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | Feature flag "Web URL Ingestion" отключен. |
| **Steps** | 1. Перейти на `/ingest` |
| **Expected Result** | Таб "Web URL" отсутствует или неактивен. |

---

### 2.4 Manual Ingestion

#### TC-02.18: Manual — успешный инжест

| Field | Value |
|-------|-------|
| **ID** | TC-02.18 |
| **Title** | Ручной ввод текста создаёт сессию с chunk-ами |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Functional |
| **Preconditions** | Backend запущен. |
| **Steps** | 1. Таб "Manual" 2. Ввести текст (>100 символов) в поле Content 3. Start Processing |
| **Expected Result** | Redirect на Session Editor. Сессия типа "manual". Chunk-и содержат введённый текст, разбитый по выбранной стратегии. |

---

#### TC-02.19: Manual — пустое поле Content

| Field | Value |
|-------|-------|
| **ID** | TC-02.19 |
| **Title** | Сабмит с пустым Content блокируется |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative |
| **Preconditions** | Таб Manual. |
| **Steps** | 1. Оставить Content пустым 2. Start Processing |
| **Expected Result** | Ошибка валидации. Запрос не отправляется. |

---

#### TC-02.20: Manual — минимальный текст

| Field | Value |
|-------|-------|
| **ID** | TC-02.20 |
| **Title** | Инжест одного слова |
| **Priority** | Low |
| **Severity** | Minor |
| **Type** | Edge case |
| **Preconditions** | Таб Manual. |
| **Steps** | 1. Ввести "Hello" 2. Start Processing |
| **Expected Result** | Сессия создана. Один chunk с текстом "Hello". |

---

#### TC-02.21: Manual — очень большой текст

| Field | Value |
|-------|-------|
| **ID** | TC-02.21 |
| **Title** | Инжест текста > 100KB |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Edge case / Performance |
| **Preconditions** | Таб Manual. |
| **Steps** | 1. Вставить очень длинный текст (100KB+) 2. Start Processing |
| **Expected Result** | Инжест завершается успешно (может занять больше времени). Текст корректно разбит на chunk-и. Или показана ошибка о превышении лимита, если есть ограничение. |

---

#### TC-02.22: Manual — спецсимволы и Unicode

| Field | Value |
|-------|-------|
| **ID** | TC-02.22 |
| **Title** | Корректная обработка Unicode, эмодзи, HTML-тегов |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Edge case |
| **Preconditions** | Таб Manual. |
| **Steps** | 1. Ввести текст с кириллицей, китайскими иероглифами, эмодзи 😀, HTML `<script>alert('xss')</script>` 2. Start Processing |
| **Expected Result** | Сессия создана. Unicode сохранён корректно. HTML-теги экранированы (XSS невозможен). Chunk-и отображают текст как есть. |

---

### 2.5 File Upload Ingestion

#### TC-02.23: File — успешный upload PDF

| Field | Value |
|-------|-------|
| **ID** | TC-02.23 |
| **Title** | Upload PDF-файла создаёт сессию |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Functional |
| **Preconditions** | Есть PDF-файл < 10 MB с текстовым содержимым. |
| **Steps** | 1. Таб "File" 2. Кликнуть зону drag-and-drop или перетащить файл 3. Выбрать PDF 4. Start Processing |
| **Expected Result** | Файл загружен. Имя файла отображается. Redirect на Session Editor. Тип сессии "file", sourceUrl: `upload://filename.pdf`. |

---

#### TC-02.24: File — upload DOCX

| Field | Value |
|-------|-------|
| **ID** | TC-02.24 |
| **Title** | Upload DOCX-файла |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Есть DOCX-файл < 10 MB. |
| **Steps** | 1. Upload DOCX 2. Start Processing |
| **Expected Result** | Сессия создана. Текст извлечён корректно. |

---

#### TC-02.25: File — upload TXT / MD / CSV

| Field | Value |
|-------|-------|
| **ID** | TC-02.25 |
| **Title** | Upload текстовых форматов (TXT, MD, CSV) |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Есть файлы каждого формата. |
| **Steps** | 1. Upload .txt → проверить chunk-и 2. Upload .md → проверить chunk-и 3. Upload .csv → проверить chunk-и |
| **Expected Result** | Каждый файл создаёт сессию с корректно извлечённым текстом. |

---

#### TC-02.26: File — неподдерживаемый формат

| Field | Value |
|-------|-------|
| **ID** | TC-02.26 |
| **Title** | Upload .exe / .jpg / .zip отклоняется |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative |
| **Preconditions** | Файл неподдерживаемого формата. |
| **Steps** | 1. Попробовать загрузить .jpg 2. Start Processing |
| **Expected Result** | Ошибка: "Format not supported (only PDF, DOCX, TXT, MD, CSV)". Файл не отправляется на сервер. |

---

#### TC-02.27: File — превышение лимита 10 MB

| Field | Value |
|-------|-------|
| **ID** | TC-02.27 |
| **Title** | Файл > 10 MB отклоняется |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative |
| **Preconditions** | Файл > 10 MB поддерживаемого формата. |
| **Steps** | 1. Загрузить файл 15 MB PDF 2. Start Processing |
| **Expected Result** | Ошибка: "File exceeds 10 MB limit". Файл не загружается. |

---

#### TC-02.28: File — пустой файл

| Field | Value |
|-------|-------|
| **ID** | TC-02.28 |
| **Title** | Upload пустого файла |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Edge case |
| **Preconditions** | Пустой .txt файл (0 bytes). |
| **Steps** | 1. Upload пустой файл 2. Start Processing |
| **Expected Result** | Ошибка: "No extractable text found in file". Или сессия создана с 0 chunk-ов. |

---

#### TC-02.29: File — scanned PDF без текстового слоя

| Field | Value |
|-------|-------|
| **ID** | TC-02.29 |
| **Title** | PDF со сканированными изображениями (без OCR) |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Edge case |
| **Preconditions** | PDF содержит только отсканированные изображения. |
| **Steps** | 1. Upload scanned PDF 2. Start Processing |
| **Expected Result** | Ошибка: "No extractable text found in file". Пустой контент не создаёт chunk-ов. |

---

#### TC-02.30: File — drag-and-drop

| Field | Value |
|-------|-------|
| **ID** | TC-02.30 |
| **Title** | Файл загружается через drag-and-drop |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | UI |
| **Preconditions** | Таб File открыт. |
| **Steps** | 1. Перетащить файл на зону dropzone 2. Проверить визуальный feedback 3. Start Processing |
| **Expected Result** | Зона подсвечивается при наведении. Имя файла появляется после drop. Файл обрабатывается. |

---

#### TC-02.31: File — без выбранного файла

| Field | Value |
|-------|-------|
| **ID** | TC-02.31 |
| **Title** | Start Processing без выбранного файла |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative |
| **Preconditions** | Таб File, файл не загружен. |
| **Steps** | 1. Нажать Start Processing без файла |
| **Expected Result** | Ошибка валидации: "Please select a file". Запрос не отправляется. |

---

#### TC-02.32: File — feature flag отключен

| Field | Value |
|-------|-------|
| **ID** | TC-02.32 |
| **Title** | Таб File скрыт при отключённом feature flag |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | Feature flag "File Upload" отключен. |
| **Steps** | 1. Перейти на `/ingest` |
| **Expected Result** | Таб "File" отсутствует или неактивен. |

---

### 2.6 Known Issues — Web Ingest HTML Pollution & Chunk Duplication

#### TC-02.35: Web URL — длинная HTML-страница с тяжёлой разметкой (crash или HTML-мусор)

| Field | Value |
|-------|-------|
| **ID** | TC-02.35 |
| **Title** | Инжест длинной HTML-страницы — HTML-теги загрязняют chunk-и после publish |
| **Priority** | Critical |
| **Severity** | Critical |
| **Type** | Known Bug / Regression |
| **Preconditions** | Backend запущен. OpenAI API доступен. Chunking = LLM (default). |
| **Steps** | 1. Таб "Web URL" 2. Вставить URL длинной статьи с тяжёлой HTML-разметкой (например, `https://dtf.ru/retro/4843876-inzhenernye-resheniya-sony-psp-chto-skryvayetsya-vnutri-konsoli` или аналогичная статья >30KB HTML) 3. Chunking Settings: оставить "LLM" (default) 4. Start Processing 5. **Вариант A — crash:** наблюдать за поведением (таймаут / ошибка / зависание) 6. **Вариант B — успех:** дождаться Session Editor, визуально проверить chunk-и 7. Если chunk-и выглядят чисто в Session Editor — нажать Preview → Publish в коллекцию 8. Открыть коллекцию → All Chunks 9. Проверить содержимое chunk-ов на наличие HTML-тегов (`<div>`, `<span>`, `<p>`, `class=`, `data-*`, CSS-стили) |
| **Expected Result (desired)** | Chunk-и содержат чистый текст без HTML-разметки на всех этапах: в Session Editor, после Preview и после Publish. Либо, если HTML не может быть очищен, система показывает предупреждение. |
| **Actual Behavior (known bug)** | **Одно из двух:** (A) Инжест отваливается — таймаут, ошибка обработки, зависание на processing. (B) Инжест проходит, chunk-и в Session Editor выглядят чисто, но после Publish в Qdrant попадают chunk-и с мусорными HTML-тегами (`<div class="...">`, `<span style="...">`, etc.), которые загрязняют поисковые результаты и chat-ответы. |
| **Root Cause Hypothesis** | Web fetcher извлекает raw HTML, но strip/sanitize не полностью очищает разметку перед записью в Qdrant. Возможно, LLM chunking видит чистый текст, но embedding pipeline получает оригинальный HTML. |
| **Repro Rate** | Высокая — воспроизводится на любой HTML-странице с богатой разметкой (media-сайты, блоги с inline-стилями). |

---

#### TC-02.36: Web URL — переключение на Character chunking → дублирование chunk-ов

| Field | Value |
|-------|-------|
| **ID** | TC-02.36 |
| **Title** | Переключение chunking method на Character вызывает многократное дублирование chunk-ов |
| **Priority** | Critical |
| **Severity** | Critical |
| **Type** | Known Bug / Regression |
| **Preconditions** | Backend запущен. |
| **Steps** | 1. Таб "Web URL" (или Manual / File — проверить все) 2. Ввести URL длинной статьи (или длинный текст в Manual) 3. Раскрыть "Chunking Settings" 4. Переключить с "LLM" на "Character" 5. Оставить default Chunk Size (1000) и Overlap (200) 6. Start Processing 7. Открыть Session Editor 8. Просмотреть список chunk-ов — подсчитать уникальные vs дублирующиеся |
| **Expected Result (desired)** | Chunk-и уникальны. Каждый fragment текста встречается ровно один раз. Общее количество chunk-ов = ceil(длина_текста / (chunk_size - overlap)). |
| **Actual Behavior (known bug)** | Каждый chunk повторяется ~10 раз. Например, для текста из 5 уникальных chunk-ов — в списке отображается 50 chunk-ов, где каждый из 5 повторяется 10 раз. Session Editor визуально показывает длинный список дублей. |
| **Root Cause Hypothesis** | Race condition или баг в character chunking strategy: генератор chunk-ов вызывается многократно, или результат не дедуплицируется. Возможно, overlapping логика некорректно пересоздаёт chunk-и. |
| **Repro Rate** | Высокая — воспроизводится при переключении на Character chunking с любым достаточно длинным контентом. |
| **Additional Checks** | 1. Проверить, происходит ли дублирование на Manual с тем же текстом 2. Проверить, происходит ли при File upload 3. Проверить, сохраняются ли дубли после Publish 4. Проверить API response: `GET /api/session/:id` — содержит ли дубли на уровне данных или только UI |

---

#### TC-02.37: Web URL — сравнение chunk content в Session Editor vs Published

| Field | Value |
|-------|-------|
| **ID** | TC-02.37 |
| **Title** | Контент chunk-ов в Session Editor совпадает с контентом после Publish |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Data Integrity / Regression |
| **Preconditions** | Web-страница с HTML-разметкой инжестирована и chunk-и созданы. |
| **Steps** | 1. Инжестировать web-страницу (LLM chunking) 2. В Session Editor: скопировать текст первых 3 chunk-ов 3. Preview → Publish в коллекцию 4. Открыть коллекцию → All Chunks 5. Сравнить текст тех же chunk-ов |
| **Expected Result** | Текст идентичен в Session Editor и в Published collection. Никакой HTML-мусор не появляется при transition draft → published. |
| **Actual Behavior (suspected)** | Текст в Session Editor чистый, но Published версия содержит HTML-теги, которых не было видно при редактировании. |

---

### 2.7 Общие негативные

#### TC-02.33: Start Processing при недоступном backend

| Field | Value |
|-------|-------|
| **ID** | TC-02.33 |
| **Title** | Обработка ошибки при недоступном backend |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative |
| **Preconditions** | Backend остановлен. |
| **Steps** | 1. Ввести валидные данные 2. Start Processing |
| **Expected Result** | Ошибка сети. Toast/notification с понятным сообщением. Кнопка не зависает в loading-состоянии навсегда. |

---

#### TC-02.34: Двойной клик по Start Processing

| Field | Value |
|-------|-------|
| **ID** | TC-02.34 |
| **Title** | Защита от двойного сабмита |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Edge case |
| **Preconditions** | Валидные данные введены. |
| **Steps** | 1. Быстро дважды нажать Start Processing |
| **Expected Result** | Создаётся только одна сессия. Кнопка блокируется во время обработки (disabled / loading state). |

---

## 3. Coverage Matrix

| Area | Happy Path | Negative | Edge Case | Validation |
|------|:----------:|:--------:|:---------:|:----------:|
| Page structure | TC-02.01 | — | — | — |
| Tab switching | TC-02.02 | — | — | — |
| Chunking Settings | TC-02.03 | — | TC-02.04 | TC-02.04 |
| Confluence (REMOVED) | — | TC-02.05, TC-02.06 | — | — |
| Web URL | TC-02.13 | TC-02.14, TC-02.15, TC-02.16 | — | TC-02.14 |
| Web URL feature | TC-02.17 | — | — | — |
| Manual | TC-02.18 | TC-02.19 | TC-02.20, TC-02.21, TC-02.22 | TC-02.19 |
| File Upload | TC-02.23, TC-02.24, TC-02.25 | TC-02.26, TC-02.27, TC-02.31 | TC-02.28, TC-02.29, TC-02.30 | TC-02.26, TC-02.27 |
| File feature | TC-02.32 | — | — | — |
| HTML Pollution (Known Bug) | — | TC-02.35 | TC-02.37 | — |
| Chunk Duplication (Known Bug) | — | TC-02.36 | — | — |
| Error handling | — | TC-02.33 | TC-02.34 | — |
