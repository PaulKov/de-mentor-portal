# DE Mentor Portal

Самостоятельный Nuxt-сервис для `Academy Experience v5`: current stage, timeline, skill graph, copy-command кнопки, evidence checklist и session handoff для уроков `de-mentor`.

Портал отделен от core-репозитория намеренно: `de-mentor` генерирует учебные стенды, SQL, docs и `session.json`, а `de-mentor-portal` независимо развивается как frontend-сервис на Vue 3 + Nuxt 3 + Vite.

## Быстрый Старт

```bash
git clone https://github.com/PaulKov/de-mentor-portal.git
cd de-mentor-portal
npm ci
MENTOR_LAB_SESSION=/absolute/path/to/session.json npm run dev
```

Если `MENTOR_LAB_SESSION` не задан, портал использует `public/session.sample.json`.

## Контракт

Портал читает `academy-session/v1`.

- schema: `contracts/academy-session/v1/session.schema.json`
- sample: `contracts/academy-session/v1/session.sample.json`
- runtime env: `MENTOR_LAB_SESSION=/path/to/session.json`

`session.json` генерируется core CLI:

```bash
python3 mentor-lab.py session greenplum start --student Иван --output artifacts/sessions/ivan
python3 mentor-lab.py session greenplum validate --session artifacts/sessions/ivan/session.json
```

## Проверки

```bash
npm ci
npm run test
npm run build
npm audit --audit-level=high
```

## Граница Ответственности

- `de-mentor`: lesson contracts, CLI, Docker labs, SQL examples, autograder, docs.
- `de-mentor-portal`: UI, interaction model, session visualization, frontend release cadence.
