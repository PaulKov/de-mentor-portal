# DE Mentor Portal

Портал самообслуживания для `Academy Experience v5`: **Mentor Live Cockpit**, текущий этап занятия, презентация, команды, evidence checklist, заметки ментора и handoff-отчет для уроков `de-mentor`.

Портал отделен от core-репозитория намеренно: `de-mentor` генерирует учебные стенды, SQL, docs и `session.json`, а `de-mentor-portal` независимо развивается как frontend-сервис на Vue 3 + Nuxt 3 + Vite.

## Оглавление

- [Быстрый старт](#быстрый-старт)
- [Mentor Live Cockpit](#mentor-live-cockpit)
- [Student Launchpad](#student-launchpad)
- [Контракт сессии](#контракт-сессии)
- [Архитектура](#архитектура)
- [Проверки](#проверки)
- [Граница ответственности](#граница-ответственности)

## Быстрый старт

```bash
git clone https://github.com/PaulKov/de-mentor-portal.git
cd de-mentor-portal
npm ci
npm run dev:sample
```

По умолчанию портал берет demo-state из `public/session.sample.json`.

Для реального занятия передайте session-файл из core CLI:

```bash
MENTOR_LAB_SESSION=/absolute/path/to/session.json npm run dev
```

Можно создать локальный `.env` из `.env.example` и прописать путь там.

## Mentor Live Cockpit

`Mentor Live Cockpit` — первый экран для проведения урока. Ментор открывает портал и сразу видит:

- выбранный stage, timebox, краткий скрипт, вопрос ученику, ожидаемый ответ и способ проверки;
- ссылку на Google Slides или локальный deck artifact из `control_plane`;
- runnable-команды из stage guide и session contract с кнопкой копирования;
- evidence checklist по ключевым навыкам;
- локальные заметки по текущему stage и отмеченные evidence items.

Чекбоксы evidence и заметки сохраняются в браузерный `localStorage` по ключу session identity:

```text
mentor-cockpit:<contract_version>:<lab_name>:<student_name>:<created_at>
```

Это удобно для живого занятия: перезагрузка страницы не сбрасывает ход урока, но данные не уходят на backend и не смешиваются между разными учениками или сессиями.

## Student Launchpad

`Student Launchpad` — режим самообслуживания ученика в том же портале. Переключатель `Ментор` / `Ученик` находится в верхней части валидной сессии; выбранный режим сохраняется локально по ключу:

```text
session-dashboard-mode:<contract_version>:<lab_name>:<student_name>:<created_at>
```

В режиме ученика портал показывает:

- подготовку окружения для `macOS`, `Windows + WSL2` и `Linux`;
- пути на `student-prep`, `student-workbook`, `homework`, SQL/deck artifacts и следующий урок из `control_plane`;
- команды запуска портала и self-check с копированием в один клик;
- список evidence items, которые ученик должен принести на занятие или после домашки.

Выбранная платформа readiness сохраняется отдельно:

```text
student-launchpad:<contract_version>:<lab_name>:<student_name>:<created_at>
```

Минимальная подготовка ученика:

```bash
docker --version
docker compose version
git --version
python3 --version
node --version
```

Для Windows портал явно ведет по маршруту `Windows + WSL2`: проверить `wsl --status`, включить Docker Desktop WSL integration и выполнять команды урока внутри WSL-дистрибутива.

## Контракт сессии

Портал читает `academy-session/v1`.

- schema: `contracts/academy-session/v1/session.schema.json`
- sample: `contracts/academy-session/v1/session.sample.json`
- runtime sample для локального запуска: `public/session.sample.json`
- runtime env для реального занятия: `MENTOR_LAB_SESSION=/path/to/session.json`

Перед запуском проверьте файл:

```bash
npm run validate:session -- public/session.sample.json
npm run validate:session -- /absolute/path/to/session.json
```

`session.json` генерируется core CLI:

```bash
python3 mentor-lab.py session greenplum start --student Иван --output artifacts/sessions/ivan
python3 mentor-lab.py session greenplum validate --session artifacts/sessions/ivan/session.json
```

## Архитектура

Портал разложен по слоям, чтобы не превращать `app.vue` в god module:

- `core/session/domain` — типы `AcademySession`, `AcademyStage`, `SkillNode`, константы контракта.
- `core/session/application` — `AcademySessionContractValidator` и `SessionLoader`.
- `core/session/infrastructure` — адаптеры источников данных, например `HttpSessionSource`.
- `composables/useSessionState.ts` — тонкий Nuxt-фасад для состояния.
- `features/session-dashboard` — композиция основного экрана.
- `features/mentor-cockpit` — live cockpit: stage player, slides/commands rail, evidence panel и local persistence facade.
- `features/student-launchpad` — student self-service: readiness по платформам, материалы, команды запуска, self-check и handoff.
- `features/timeline`, `features/commands`, `features/evidence`, `features/skill-graph`, `features/session-status` — независимые UI-фичи.
- `components/shared/ui` — переиспользуемые Vue-компоненты без знания предметной области.
- `shared/utils` — framework-agnostic утилиты, например clipboard adapter.
- `server/api/session.get.ts` — endpoint чтения `MENTOR_LAB_SESSION`, `public/session.json` или sample.

Зависимости идут сверху вниз: UI зависит от `core`, но `core` не знает о Nuxt, Vue и браузере.

## Проверки

```bash
npm ci
npm run test
npm run validate:session -- public/session.sample.json
npm run build
npm run preview:built -- 3471
npm run test:e2e
npm audit --audit-level=high
```

Если Playwright запускается впервые на машине, установите Chromium:

```bash
npx playwright install chromium
```

Одна команда для локального preflight:

```bash
npm run check
```

Quality guard входит в `npm run test`:

- любой модуль Vue/TypeScript/JavaScript должен быть не больше `400` SLOC;
- средний clustering coefficient внутреннего import-графа должен быть не больше `0.180`;
- `app.vue` и `composables/useSessionState.ts` остаются тонкими фасадами, а доменная логика живет в `core/session`.

## Граница ответственности

- `de-mentor`: lesson contracts, CLI, Docker labs, SQL examples, autograder, docs.
- `de-mentor-portal`: UI, interaction model, session visualization, frontend release cadence.
