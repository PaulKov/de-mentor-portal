# DE Mentor Portal

Портал самообслуживания для `Academy Experience v5`: текущий этап занятия, timeline, skill graph, быстрые команды, evidence checklist и handoff-отчет для уроков `de-mentor`.

Портал отделен от core-репозитория намеренно: `de-mentor` генерирует учебные стенды, SQL, docs и `session.json`, а `de-mentor-portal` независимо развивается как frontend-сервис на Vue 3 + Nuxt 3 + Vite.

## Оглавление

- [Быстрый старт](#быстрый-старт)
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
