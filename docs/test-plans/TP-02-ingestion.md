# TP-02: Ingestion

**Module:** Ingestion
**Page:** `/ingest`
**Priority:** Critical
**Last updated:** 2026-03-14

---

## 1. Overview

Страница Ingestion — точка входа контента в систему. Четыре таба источников: Confluence, Web URL, Manual, File. Каждый таб имеет свои поля ввода. Общие элементы: Chunking Settings (LLM / Character), кнопка "Start Processing". Результат — создание draft-сессии с chunk-ами.

---

## 2. Test Cases

### 2.1 Общие / UI

#### TC-02.01: Отображение страницы Ingestion

| Field | Value |
|-------|-------|
| **ID** | TC-02.01 |
| **Title** | Страница Ingestion загружается с четырьмя табами |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Smoke |
| **Preconditions** | Backend запущен. |
| **Steps** | 1. Перейти на `/ingest` |
| **Expected Result** | Заголовок "Add Knowledge Source", подзаголовок "Import content to create a new editing session." Четыре таба: Confluence (активный по умолчанию), Web URL, Manual, File. Кнопка "Start Processing" внизу. |

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
| **Steps** | 1. Кликнуть "Web URL" — проверить поля 2. Кликнуть "Manual" — проверить textarea 3. Кликнуть "File" — проверить drag-and-drop зону 4. Вернуться на "Confluence" |
| **Expected Result** | Confluence: поля "Confluence Page URL" и "Page ID". Web URL: поле "Web Page URL". Manual: textarea "Content". File: зона drag-and-drop с подписью "Drop a file here or click to browse". Активный таб визуально выделен. |

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

### 2.2 Confluence Ingestion

#### TC-02.05: Confluence — успешный инжест по URL

| Field | Value |
|-------|-------|
| **ID** | TC-02.05 |
| **Title** | Инжест Confluence страницы по URL создаёт сессию |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Functional |
| **Preconditions** | Confluence credentials настроены в env. Страница доступна. |
| **Steps** | 1. Перейти на `/ingest`, таб Confluence 2. Ввести валидный Confluence URL 3. Нажать "Start Processing" |
| **Expected Result** | Появляется индикатор загрузки. После завершения — редирект на Session Editor (`/session/:id`). Сессия содержит chunk-и из Confluence-документа. |

---

#### TC-02.06: Confluence — успешный инжест по Page ID

| Field | Value |
|-------|-------|
| **ID** | TC-02.06 |
| **Title** | Инжест Confluence страницы по Page ID работает |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Confluence настроен. Известен Page ID. |
| **Steps** | 1. Таб Confluence 2. Оставить URL пустым 3. Ввести валидный Page ID 4. Start Processing |
| **Expected Result** | Сессия создана. Redirect на Session Editor. |

---

#### TC-02.07: Confluence — пустые поля

| Field | Value |
|-------|-------|
| **ID** | TC-02.07 |
| **Title** | Сабмит без URL и Page ID показывает ошибку |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative |
| **Preconditions** | Таб Confluence. |
| **Steps** | 1. Не заполнять ни URL, ни Page ID 2. Нажать "Start Processing" |
| **Expected Result** | Ошибка валидации: "Please provide either a Confluence URL or Page ID". Кнопка не отправляет запрос. |

---

#### TC-02.08: Confluence — оба поля заполнены

| Field | Value |
|-------|-------|
| **ID** | TC-02.08 |
| **Title** | Поведение при заполнении и URL, и Page ID одновременно |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Edge case |
| **Preconditions** | Таб Confluence. |
| **Steps** | 1. Ввести и URL, и Page ID 2. Start Processing |
| **Expected Result** | Система использует один из параметров (приоритет URL или показывает предупреждение). Инжест выполняется без ошибки. |

---

#### TC-02.09: Confluence — невалидный URL

| Field | Value |
|-------|-------|
| **ID** | TC-02.09 |
| **Title** | Невалидный Confluence URL — ошибка |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative |
| **Preconditions** | Confluence настроен. |
| **Steps** | 1. Ввести `not-a-url` 2. Start Processing |
| **Expected Result** | Ошибка: URL не валиден. Toast/notification с описанием ошибки. |

---

#### TC-02.10: Confluence — неверные credentials

| Field | Value |
|-------|-------|
| **ID** | TC-02.10 |
| **Title** | Ошибка аутентификации при неверных Confluence credentials |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative |
| **Preconditions** | Confluence credentials в env некорректны или отсутствуют. |
| **Steps** | 1. Ввести валидный URL 2. Start Processing |
| **Expected Result** | Ошибка 401: "Confluence credentials invalid" или аналогичное сообщение. Toast с ошибкой. |

---

#### TC-02.11: Confluence — несуществующая страница

| Field | Value |
|-------|-------|
| **ID** | TC-02.11 |
| **Title** | Инжест несуществующей Confluence-страницы |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Negative |
| **Preconditions** | Confluence настроен. |
| **Steps** | 1. Ввести URL несуществующей страницы или невалидный Page ID 2. Start Processing |
| **Expected Result** | Ошибка 404: "Page not found". Чёткое сообщение пользователю. |

---

#### TC-02.12: Confluence — feature flag отключен

| Field | Value |
|-------|-------|
| **ID** | TC-02.12 |
| **Title** | Таб Confluence скрыт/недоступен при отключённом feature flag |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | Feature flag "Confluence Ingestion" отключен в Settings → Features. |
| **Steps** | 1. Перейти на `/ingest` |
| **Expected Result** | Таб "Confluence" отсутствует или неактивен. Попытка инжеста через API возвращает ошибку. |

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

### 2.6 Общие негативные

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
| Confluence | TC-02.05, TC-02.06 | TC-02.07, TC-02.09, TC-02.10, TC-02.11 | TC-02.08 | TC-02.07 |
| Confluence feature | TC-02.12 | — | — | — |
| Web URL | TC-02.13 | TC-02.14, TC-02.15, TC-02.16 | — | TC-02.14 |
| Web URL feature | TC-02.17 | — | — | — |
| Manual | TC-02.18 | TC-02.19 | TC-02.20, TC-02.21, TC-02.22 | TC-02.19 |
| File Upload | TC-02.23, TC-02.24, TC-02.25 | TC-02.26, TC-02.27, TC-02.31 | TC-02.28, TC-02.29, TC-02.30 | TC-02.26, TC-02.27 |
| File feature | TC-02.32 | — | — | — |
| Error handling | — | TC-02.33 | TC-02.34 | — |
