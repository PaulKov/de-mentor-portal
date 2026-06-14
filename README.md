# DE Mentor Portal

Портал самообслуживания для `Academy Experience v5`: **Academy Lesson Hub**, **Mentor Live Cockpit**, **Student Launchpad**, текущий этап занятия, презентация, команды, evidence checklist, заметки ментора и handoff-отчет для уроков `de-mentor`.

Портал отделен от core-репозитория намеренно: `de-mentor` генерирует учебные стенды, SQL, docs, `catalog.json` и `session.json`, а `de-mentor-portal` независимо развивается как frontend-сервис на Vue 3 + Nuxt 3 + Vite.

## Оглавление

- [Быстрый старт](#быстрый-старт)
- [Academy Lesson Hub](#academy-lesson-hub)
- [Mentor Live Cockpit](#mentor-live-cockpit)
- [Student Launchpad](#student-launchpad)
- [Контракт каталога](#контракт-каталога)
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

По умолчанию портал берет каталог уроков из `public/catalog.sample.json`, а текущую live-сессию из `public/session.sample.json`.

Для реального набора уроков передайте catalog-файл из core CLI или другого publishing pipeline:

```bash
ACADEMY_CATALOG=/absolute/path/to/catalog.json npm run dev
```

Для реального занятия передайте session-файл из core CLI:

```bash
MENTOR_LAB_SESSION=/absolute/path/to/session.json npm run dev
```

Можно создать локальный `.env` из `.env.example` и прописать путь там.

## Academy Lesson Hub

`Academy Lesson Hub` — первый экран портала. Он показывает учебные направления, уроки, роли `Ментор` / `Ученик`, материалы, readiness-пункты и команды запуска без необходимости помнить структуру core-репозитория.

На sample-каталоге уже видны направления:

- `Greenplum`
- `ClickHouse`
- `Hadoop`
- `Spark`
- `Postgres`

Хаб решает две задачи:

- ментор быстро выбирает направление и видит, какие материалы, runbook-команды и проверки нужны для урока;
- ученик получает тот же каталог, но в student-friendly режиме с подготовкой окружения, workbook/homework и командами self-check.

Выбор направления, урока и роли сохраняется локально:

```text
academy-lesson-hub:<contract_version>:<generated_at>
```

Кнопка `Открыть текущую сессию` переводит из каталога в live-экран занятия. Последняя выбранная поверхность портала сохраняется в браузере, поэтому перезагрузка во время урока не возвращает ментора обратно в каталог.

## Mentor Live Cockpit

`Mentor Live Cockpit` — экран для проведения конкретной live-сессии. Ментор открывает текущую сессию из хаба и сразу видит:

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

## Контракт каталога

Портал читает `academy-catalog/v1`.

- компактный contract sample: `contracts/academy-catalog/v1/catalog.sample.json`
- описание contract markers: `contracts/academy-catalog/v1/README.md`
- runtime sample для локального запуска: `public/catalog.sample.json`
- runtime env для реального каталога: `ACADEMY_CATALOG=/path/to/catalog.json`

Порядок источников:

1. `ACADEMY_CATALOG`
2. `public/catalog.json`
3. `public/catalog.sample.json`

Каталог намеренно отделен от `academy-session/v1`: он отвечает за витрину направлений, уроков и self-service материалов, а session contract отвечает за конкретный live-запуск с текущим stage, progress и evidence.

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
- `core/catalog/domain` — типы `AcademyCatalog`, `AcademyTrack`, `CatalogLesson`, константы контракта.
- `core/catalog/application` — `AcademyCatalogContractValidator` и `CatalogLoader`.
- `core/catalog/infrastructure` — адаптеры источников данных, например `HttpCatalogSource`.
- `composables/useSessionState.ts` — тонкий Nuxt-фасад для состояния.
- `composables/useCatalogState.ts` — тонкий Nuxt-фасад для состояния каталога.
- `features/academy-portal` — переключение между catalog-first поверхностью и текущей live-сессией.
- `features/lesson-hub` — витрина направлений, уроков, role-aware команд и readiness.
- `features/session-dashboard` — композиция основного экрана.
- `features/mentor-cockpit` — live cockpit: stage player, slides/commands rail, evidence panel и local persistence facade.
- `features/student-launchpad` — student self-service: readiness по платформам, материалы, команды запуска, self-check и handoff.
- `features/timeline`, `features/commands`, `features/evidence`, `features/skill-graph`, `features/session-status` — независимые UI-фичи.
- `components/shared/ui` — переиспользуемые Vue-компоненты без знания предметной области.
- `shared/utils` — framework-agnostic утилиты, например clipboard adapter.
- `server/api/catalog.get.ts` — endpoint чтения `ACADEMY_CATALOG`, `public/catalog.json` или sample.
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
- `app.vue`, `composables/useSessionState.ts` и `composables/useCatalogState.ts` остаются тонкими фасадами, а доменная логика живет в `core/session` и `core/catalog`.

## Граница ответственности

- `de-mentor`: lesson contracts, CLI, Docker labs, SQL examples, autograder, docs.
- `de-mentor-portal`: UI, interaction model, academy catalog visualization, session visualization, frontend release cadence.
