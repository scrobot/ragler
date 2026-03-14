# TP-03: Sessions & Content Editor

**Module:** Sessions
**Pages:** `/sessions`, `/session/:id`
**Priority:** Critical
**Last updated:** 2026-03-14

---

## 1. Overview

Модуль Sessions управляет жизненным циклом draft-контента: список сессий, редактирование chunk-ов (edit, split, merge), preview и publish. Сессии хранятся в Redis с TTL (24h).

---

## 2. Test Cases

### 2.1 Sessions List (`/sessions`)

#### TC-03.01: Отображение списка сессий

| Field | Value |
|-------|-------|
| **ID** | TC-03.01 |
| **Title** | Страница Sessions показывает все draft-сессии |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Smoke |
| **Preconditions** | Есть хотя бы одна draft-сессия. |
| **Steps** | 1. Перейти на `/sessions` |
| **Expected Result** | Заголовок "Sessions", подзаголовок "Draft sessions awaiting review and publishing." Таблица с колонками: Source, Type, Status, Chunks, Created, Updated, Actions. Кнопка "+ New Session" вверху. |

---

#### TC-03.02: Пустой список сессий

| Field | Value |
|-------|-------|
| **ID** | TC-03.02 |
| **Title** | Пустое состояние при отсутствии сессий |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Edge case |
| **Preconditions** | Нет draft-сессий. |
| **Steps** | 1. Перейти на `/sessions` |
| **Expected Result** | Пустая таблица или placeholder "No sessions found". Кнопка "+ New Session" доступна. |

---

#### TC-03.03: Данные сессии в таблице

| Field | Value |
|-------|-------|
| **ID** | TC-03.03 |
| **Title** | Корректное отображение данных сессии |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Существует Manual-сессия с 16 chunk-ами. |
| **Steps** | 1. Открыть `/sessions` 2. Проверить строку сессии |
| **Expected Result** | Source: показывает URL/identifier. Type: иконка + "Manual". Status: badge "DRAFT". Chunks: число (16). Created/Updated: дата и время в читаемом формате. Actions: кнопка удаления (корзина). |

---

#### TC-03.04: Кнопка "+ New Session"

| Field | Value |
|-------|-------|
| **ID** | TC-03.04 |
| **Title** | Кнопка New Session ведёт на Ingestion |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | Страница Sessions загружена. |
| **Steps** | 1. Нажать "+ New Session" |
| **Expected Result** | Redirect на `/ingest`. |

---

#### TC-03.05: Удаление сессии из списка

| Field | Value |
|-------|-------|
| **ID** | TC-03.05 |
| **Title** | Удаление draft-сессии через иконку корзины |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Есть draft-сессия. |
| **Steps** | 1. Нажать иконку корзины в строке сессии 2. Подтвердить удаление (если есть confirmation) |
| **Expected Result** | Сессия удалена. Строка исчезает из таблицы. Toast "Session deleted". |

---

#### TC-03.06: Клик по сессии → открытие Content Editor

| Field | Value |
|-------|-------|
| **ID** | TC-03.06 |
| **Title** | Клик по строке сессии открывает Content Editor |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Functional |
| **Preconditions** | Есть draft-сессия. |
| **Steps** | 1. Кликнуть по строке сессии (не по кнопке удаления) |
| **Expected Result** | Redirect на `/session/:id`. Content Editor загружен с chunk-ами. |

---

### 2.2 Content Editor (`/session/:id`)

#### TC-03.07: Отображение Content Editor

| Field | Value |
|-------|-------|
| **ID** | TC-03.07 |
| **Title** | Content Editor показывает chunk-и сессии |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Smoke |
| **Preconditions** | Draft-сессия с chunk-ами. |
| **Steps** | 1. Открыть `/session/:id` |
| **Expected Result** | Breadcrumb: "← / session / session_...". Заголовок "Content Editor". Source URL отображается. Кнопки: иконка Delete (корзина), "Preview", "Publish". Список chunk-ов с чекбоксами. Каждый chunk имеет иконки: Edit (карандаш), Split (ножницы), Merge(?). |

---

#### TC-03.08: Редактирование текста chunk-а

| Field | Value |
|-------|-------|
| **ID** | TC-03.08 |
| **Title** | Редактирование текста chunk-а через Edit |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Functional |
| **Preconditions** | Content Editor открыт. |
| **Steps** | 1. Нажать иконку Edit (карандаш) на chunk-е 2. Изменить текст 3. Сохранить (Enter / кнопка Save) |
| **Expected Result** | Chunk переходит в режим редактирования (textarea/input). Текст изменён. При сохранении — обновлённый текст отображается. Toast подтверждения. |

---

#### TC-03.09: Отмена редактирования chunk-а

| Field | Value |
|-------|-------|
| **ID** | TC-03.09 |
| **Title** | Отмена изменений при редактировании |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | Chunk в режиме редактирования. |
| **Steps** | 1. Начать редактирование 2. Изменить текст 3. Нажать Cancel / Escape |
| **Expected Result** | Текст возвращается к оригиналу. Режим редактирования закрыт. |

---

#### TC-03.10: Split chunk

| Field | Value |
|-------|-------|
| **ID** | TC-03.10 |
| **Title** | Разделение chunk-а на два |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Chunk с текстом > 50 символов. |
| **Steps** | 1. Нажать иконку Split на chunk-е 2. Указать точку разделения (курсор / ввод позиции) 3. Подтвердить |
| **Expected Result** | Chunk разделён на два chunk-а. Оба видны в списке. Суммарный текст = оригинальный. Порядок сохранён. |

---

#### TC-03.11: Merge chunks

| Field | Value |
|-------|-------|
| **ID** | TC-03.11 |
| **Title** | Объединение нескольких chunk-ов |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Минимум 2 chunk-а. |
| **Steps** | 1. Выбрать чекбоксы на 2+ chunk-ах 2. Нажать Merge (если появляется кнопка при выборе) |
| **Expected Result** | Выбранные chunk-и объединены в один. Текст — конкатенация в порядке позиций. Количество chunk-ов уменьшилось. |

---

#### TC-03.12: Merge — менее 2 chunk-ов

| Field | Value |
|-------|-------|
| **ID** | TC-03.12 |
| **Title** | Merge недоступен при выборе < 2 chunk-ов |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Negative |
| **Preconditions** | Content Editor открыт. |
| **Steps** | 1. Выбрать только 1 chunk 2. Попробовать Merge |
| **Expected Result** | Кнопка Merge disabled / скрыта. Или ошибка: "Merge requires at least 2 chunks". |

---

#### TC-03.13: Delete chunk в редакторе

| Field | Value |
|-------|-------|
| **ID** | TC-03.13 |
| **Title** | Удаление chunk-а из сессии |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Сессия с > 1 chunk. |
| **Steps** | 1. Нажать Delete на chunk-е (если есть) или через контекстное меню |
| **Expected Result** | Chunk удалён из списка. Счётчик chunk-ов уменьшен. |

---

#### TC-03.14: Preview — успешный

| Field | Value |
|-------|-------|
| **ID** | TC-03.14 |
| **Title** | Preview блокирует сессию и запускает валидацию |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Functional |
| **Preconditions** | Сессия с chunk-ами, статус "created". |
| **Steps** | 1. Нажать кнопку "Preview" |
| **Expected Result** | Статус сессии → "previewed". Валидация проходит. Модальное окно или визуальное подтверждение preview. Chunk-и больше нельзя редактировать (lock). |

---

#### TC-03.15: Preview пустой сессии

| Field | Value |
|-------|-------|
| **ID** | TC-03.15 |
| **Title** | Preview невозможен без chunk-ов |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative |
| **Preconditions** | Сессия без chunk-ов (все удалены). |
| **Steps** | 1. Удалить все chunk-и 2. Нажать Preview |
| **Expected Result** | Ошибка: "Cannot preview empty session". Кнопка Preview блокирована или ошибка при нажатии. |

---

#### TC-03.16: Publish — успешный

| Field | Value |
|-------|-------|
| **ID** | TC-03.16 |
| **Title** | Publish публикует chunk-и в выбранную коллекцию |
| **Priority** | Critical |
| **Severity** | Blocker |
| **Type** | Functional |
| **Preconditions** | Сессия в статусе "previewed". Существует целевая коллекция. |
| **Steps** | 1. Нажать "Publish" 2. Выбрать target collection из dropdown 3. Подтвердить |
| **Expected Result** | Publish запущен. После завершения: toast "Published N chunks to collection X". Redirect на `/sessions` или коллекцию. Сессия удалена из списка sessions. Chunk-и появились в коллекции. |

---

#### TC-03.17: Publish без Preview

| Field | Value |
|-------|-------|
| **ID** | TC-03.17 |
| **Title** | Publish заблокирован без предварительного Preview |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative |
| **Preconditions** | Сессия в статусе "created" (не previewed). |
| **Steps** | 1. Нажать "Publish" без предварительного Preview |
| **Expected Result** | Ошибка: "Session must be previewed before publish". Или кнопка Publish disabled до выполнения Preview. |

---

#### TC-03.18: Publish без выбранной коллекции

| Field | Value |
|-------|-------|
| **ID** | TC-03.18 |
| **Title** | Publish без target collection невозможен |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Negative |
| **Preconditions** | Сессия previewed. |
| **Steps** | 1. Нажать Publish 2. Не выбирать коллекцию 3. Подтвердить |
| **Expected Result** | Ошибка валидации: "Please select a target collection". |

---

#### TC-03.19: Delete session из Content Editor

| Field | Value |
|-------|-------|
| **ID** | TC-03.19 |
| **Title** | Удаление всей сессии через иконку корзины |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Content Editor открыт. |
| **Steps** | 1. Нажать красную иконку корзины рядом с заголовком 2. Подтвердить |
| **Expected Result** | Сессия удалена. Redirect на `/sessions`. Сессия не отображается в списке. |

---

#### TC-03.20: Breadcrumb навигация

| Field | Value |
|-------|-------|
| **ID** | TC-03.20 |
| **Title** | Breadcrumb позволяет вернуться назад |
| **Priority** | Low |
| **Severity** | Minor |
| **Type** | UI |
| **Preconditions** | Content Editor открыт. |
| **Steps** | 1. Нажать "←" или "session" в breadcrumb |
| **Expected Result** | Redirect на `/sessions`. |

---

#### TC-03.21: Несуществующая сессия

| Field | Value |
|-------|-------|
| **ID** | TC-03.21 |
| **Title** | Открытие несуществующего session ID |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Negative |
| **Preconditions** | — |
| **Steps** | 1. Перейти на `/session/non-existent-uuid` |
| **Expected Result** | Ошибка 404: "Session not found" или redirect на `/sessions` с toast. |

---

#### TC-03.22: Expired session (TTL)

| Field | Value |
|-------|-------|
| **ID** | TC-03.22 |
| **Title** | Открытие сессии после истечения TTL |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Edge case |
| **Preconditions** | Сессия создана > 24h назад. |
| **Steps** | 1. Открыть `/session/:id` для expired сессии |
| **Expected Result** | Ошибка: "Session expired" (410). Сообщение пользователю. |

---

#### TC-03.24: Generate Chunk — AI-генерация нового chunk-а

| Field | Value |
|-------|-------|
| **ID** | TC-03.24 |
| **Title** | Генерация нового chunk-а через AI prompt |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | Session Editor открыт. OpenAI доступен. |
| **Steps** | 1. Нажать кнопку генерации chunk-а (если доступна) 2. Ввести prompt 3. Подтвердить |
| **Expected Result** | Новый chunk создан на основе AI-генерации. Текст соответствует prompt. Chunk добавлен в список сессии. |

---

#### TC-03.23: Порядок chunk-ов после операций

| Field | Value |
|-------|-------|
| **ID** | TC-03.23 |
| **Title** | Порядок chunk-ов сохраняется после split/merge/edit |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Сессия с 5+ chunk-ами. |
| **Steps** | 1. Запомнить порядок chunk-ов 2. Split chunk #3 3. Merge chunk #1 + #2 4. Edit chunk #4 5. Проверить порядок |
| **Expected Result** | Порядок логически корректен: merged chunk на месте #1, split chunks на месте #3, edit не меняет позицию. |

---

## 3. Coverage Matrix

| Area | Happy Path | Negative | Edge Case |
|------|:----------:|:--------:|:---------:|
| Sessions List | TC-03.01, TC-03.03 | — | TC-03.02 |
| Session Navigation | TC-03.04, TC-03.06, TC-03.20 | TC-03.21 | TC-03.22 |
| Session Delete | TC-03.05, TC-03.19 | — | — |
| Chunk Edit | TC-03.08, TC-03.09 | — | — |
| Chunk Split | TC-03.10 | — | — |
| Chunk Merge | TC-03.11 | TC-03.12 | — |
| Chunk Delete | TC-03.13 | — | — |
| Preview | TC-03.14 | TC-03.15 | — |
| Publish | TC-03.16 | TC-03.17, TC-03.18 | — |
| Chunk Order | TC-03.23 | — | — |
