# TP-01: Dashboard

**Module:** Dashboard
**Page:** `/dashboard`
**Priority:** Medium
**Last updated:** 2026-03-14

---

## 1. Overview

Dashboard — стартовая страница приложения. Показывает обзорные метрики (Total Collections, System Status, Active Sessions) и Quick Actions для перехода к основным функциям.

---

## 2. Test Cases

### TC-01.01: Отображение Dashboard при первом входе

| Field | Value |
|-------|-------|
| **ID** | TC-01.01 |
| **Title** | Dashboard загружается и отображает корректную структуру |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Smoke / Functional |
| **Preconditions** | Backend запущен и доступен. Redis и Qdrant operational. |
| **Steps** | 1. Открыть `http://localhost:3000/dashboard` |
| **Expected Result** | Страница загружается. Видны: заголовок "Dashboard", описание "Overview of your Knowledge Management System.", три карточки метрик (Total Collections, System Status, Active Sessions), блок Quick Actions с кнопками "Ingest New Content" и "Manage Collections". Sidebar содержит навигацию: Dashboard, Ingestion, Sessions, Collections, Chat, System Prompts, Agent Model, Features. |

---

### TC-01.02: Карточка Total Collections — корректное количество

| Field | Value |
|-------|-------|
| **ID** | TC-01.02 |
| **Title** | Total Collections отображает реальное количество коллекций |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | В системе существует N коллекций (N > 0). |
| **Steps** | 1. Открыть `/dashboard` 2. Прочитать число в карточке "Total Collections" 3. Открыть `/collections` и подсчитать записи в таблице |
| **Expected Result** | Число в карточке Dashboard совпадает с количеством коллекций на странице Collections. Подпись "Managed knowledge bases" отображается. |

---

### TC-01.03: Total Collections при нулевых коллекциях

| Field | Value |
|-------|-------|
| **ID** | TC-01.03 |
| **Title** | Total Collections показывает 0 при пустой системе |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Edge case |
| **Preconditions** | Все коллекции удалены. |
| **Steps** | 1. Удалить все коллекции 2. Перейти на `/dashboard` |
| **Expected Result** | Карточка отображает число `0`. |

---

### TC-01.04: System Status — Operational

| Field | Value |
|-------|-------|
| **ID** | TC-01.04 |
| **Title** | System Status показывает Operational при здоровых зависимостях |
| **Priority** | Critical |
| **Severity** | Critical |
| **Type** | Functional |
| **Preconditions** | Redis и Qdrant запущены и доступны. |
| **Steps** | 1. Открыть `/dashboard` |
| **Expected Result** | Карточка System Status отображает зелёный текст "Operational" и подпись "Backend connection". |

---

### TC-01.05: System Status — Backend недоступен

| Field | Value |
|-------|-------|
| **ID** | TC-01.05 |
| **Title** | System Status отображает ошибку при недоступном backend |
| **Priority** | High |
| **Severity** | Critical |
| **Type** | Negative |
| **Preconditions** | Backend-сервер остановлен. |
| **Steps** | 1. Остановить backend 2. Перейти на `/dashboard` |
| **Expected Result** | Карточка System Status показывает статус ошибки (не "Operational"). Пользователь понимает, что система недоступна. |

---

### TC-01.06: Active Sessions — отображение метрики

| Field | Value |
|-------|-------|
| **ID** | TC-01.06 |
| **Title** | Active Sessions показывает количество активных draft-сессий |
| **Priority** | Medium |
| **Severity** | Minor |
| **Type** | Functional |
| **Preconditions** | Существует хотя бы одна draft-сессия. |
| **Steps** | 1. Создать ingest-сессию (Manual → текст → Start Processing) 2. Перейти на `/dashboard` |
| **Expected Result** | Карточка Active Sessions показывает число, соответствующее реальному количеству draft-сессий. |

---

### TC-01.07: Active Sessions — "Metrics unavailable"

| Field | Value |
|-------|-------|
| **ID** | TC-01.07 |
| **Title** | Active Sessions показывает "Metrics unavailable" при отсутствии данных |
| **Priority** | Low |
| **Severity** | Trivial |
| **Type** | Edge case |
| **Preconditions** | Метрики сессий недоступны (API не возвращает данные). |
| **Steps** | 1. Перейти на `/dashboard` |
| **Expected Result** | Карточка показывает "--" и текст "Metrics unavailable". |

---

### TC-01.08: Quick Action — Ingest New Content

| Field | Value |
|-------|-------|
| **ID** | TC-01.08 |
| **Title** | Кнопка "Ingest New Content" ведёт на страницу Ingestion |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Dashboard загружен. |
| **Steps** | 1. Нажать кнопку "Ingest New Content" в блоке Quick Actions |
| **Expected Result** | Пользователь перенаправлен на `/ingest`. Страница Ingestion загружена корректно. |

---

### TC-01.09: Quick Action — Manage Collections

| Field | Value |
|-------|-------|
| **ID** | TC-01.09 |
| **Title** | Кнопка "Manage Collections" ведёт на страницу Collections |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Dashboard загружен. |
| **Steps** | 1. Нажать кнопку "Manage Collections" в блоке Quick Actions |
| **Expected Result** | Пользователь перенаправлен на `/collections`. |

---

### TC-01.10: Sidebar навигация

| Field | Value |
|-------|-------|
| **ID** | TC-01.10 |
| **Title** | Все ссылки sidebar ведут на правильные страницы |
| **Priority** | High |
| **Severity** | Major |
| **Type** | Functional |
| **Preconditions** | Приложение загружено. |
| **Steps** | 1. Кликнуть Dashboard → проверить URL `/dashboard` 2. Кликнуть Ingestion → `/ingest` 3. Кликнуть Sessions → `/sessions` 4. Кликнуть Collections → `/collections` 5. Кликнуть Chat → `/chat` 6. Кликнуть System Prompts → `/settings/prompts` 7. Кликнуть Agent Model → `/settings/agent` 8. Кликнуть Features → `/settings/features` |
| **Expected Result** | Каждая ссылка ведёт на ожидаемый URL. Активный пункт меню подсвечен. |

---

### TC-01.11: Footer ссылки

| Field | Value |
|-------|-------|
| **ID** | TC-01.11 |
| **Title** | Footer содержит корректные ссылки |
| **Priority** | Low |
| **Severity** | Trivial |
| **Type** | Functional |
| **Preconditions** | Dashboard загружен. |
| **Steps** | 1. Проскроллить до footer 2. Проверить ссылки: Docs, GitHub, Support |
| **Expected Result** | "Docs" ведёт на `https://scrobot.github.io/ragler`, "GitHub" на `https://github.com/scrobot/ragler`, "Support" на `https://github.com/scrobot/ragler/issues`. Копирайт: "2026 © RAGler". |

---

### TC-01.12: Responsive — sidebar collapse

| Field | Value |
|-------|-------|
| **ID** | TC-01.12 |
| **Title** | Sidebar сворачивается на узких экранах |
| **Priority** | Low |
| **Severity** | Minor |
| **Type** | UI / Responsive |
| **Preconditions** | Dashboard загружен. |
| **Steps** | 1. Уменьшить ширину окна браузера до < 768px 2. Проверить поведение sidebar |
| **Expected Result** | Sidebar сворачивается в compact-режим (mini-logo). Навигация доступна через hamburger-меню или иконки. Контент не перекрывается. |

---

## 3. Coverage Matrix

| Area | Happy Path | Negative | Edge Case | UI/Visual |
|------|:----------:|:--------:|:---------:|:---------:|
| Total Collections | TC-01.02 | — | TC-01.03 | — |
| System Status | TC-01.04 | TC-01.05 | — | — |
| Active Sessions | TC-01.06 | — | TC-01.07 | — |
| Quick Actions | TC-01.08, TC-01.09 | — | — | — |
| Navigation | TC-01.10, TC-01.11 | — | — | TC-01.12 |
| Page Load | TC-01.01 | TC-01.05 | — | — |
