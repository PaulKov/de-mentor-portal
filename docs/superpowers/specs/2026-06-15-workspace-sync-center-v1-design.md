# Workspace Sync Center v1 Design

## Контекст

К релизу `v0.9.0` портал уже закрывает полный mentor lifecycle:

- authoring: `Lesson Authoring Studio`;
- подготовка: `Academy Lesson Hub`, `Lesson Launcher`, `Release Console`, `Session Workspace`;
- проведение: `Mentor Live Cockpit`, `Delivery Control Room`, `Evidence Ledger`;
- закрытие: `Review Center`, `Submission Inbox`, `Skill Assessment Center`, `Post-Lesson Pack`;
- обзор: `Mentor Mission Control`, `Cohort Dashboard`.

Главное ограничение текущей версии: рабочие данные живут в разных browser-local ключах. Это удобно для автономности, но рискованно для реальной работы: draft, session imports, submissions, ledger и notes можно потерять при смене браузера, очистке storage или работе на другой машине.

## Цель

Добавить `Workspace Sync Center` как новую portal surface, которая собирает весь browser-local state портала в один переносимый workspace package, валидирует его и умеет восстановить обратно.

Экран должен помочь ментору:

- увидеть, какие local states уже есть;
- экспортировать backup одним JSON;
- импортировать backup на другой машине;
- понять, какие записи будут восстановлены;
- получить PR/release bundle summary для проверки материалов.

## Не цели v1

- Не делать backend persistence, auth или cloud sync.
- Не синхронизировать данные между несколькими открытыми вкладками в реальном времени.
- Не писать файлы в repo из браузера.
- Не делать conflict merge между двумя workspace package.
- Не загружать package напрямую в GitHub/Drive.
- Не менять контракты `academy-catalog/v1` и `academy-session/v1`.

## UX-модель

`Workspace Sync Center` — это операционный экран backup/restore.

Верх экрана:

- workspace title;
- readiness/status;
- количество записей;
- общий размер package;
- primary action `Скопировать workspace JSON`.

Основные зоны:

1. `Snapshot Summary` — сколько записей собрано по группам.
2. `Workspace Records` — таблица ключей: group, key, status, size.
3. `Validation` — ошибки/предупреждения по package.
4. `Import / Restore` — textarea для JSON package, preview и кнопка restore.
5. `PR Bundle` — Markdown summary для pull request или release notes.

## Навигация

Добавить новую `PortalSurface`: `sync`.

Порядок в `Global Navigation`:

```text
hub -> authoring -> sync -> mission-control -> release -> workspace -> session -> review -> assessment -> submission -> cohort -> post-lesson
```

Route guard:

- `sync` требует валидный catalog;
- валидная session не обязательна;
- если catalog невалиден, пользователь остается в `hub`/diagnostic state.

## Архитектура

Новая feature-зона:

```text
features/workspace-sync/
  WorkspaceSyncCenter.vue
  workspace-sync-state.ts
  useWorkspaceSyncState.ts
assets/css/workspace-sync.css
```

`workspace-sync-state.ts` является чистым state-builder:

- принимает catalog/session metadata и список storage records;
- группирует records по понятным доменным областям;
- строит export package;
- валидирует import package;
- формирует restore preview и Markdown summary.

`useWorkspaceSyncState.ts` является browser-local фасадом:

- перечисляет `window.localStorage`;
- фильтрует только разрешенные portal prefixes;
- читает JSON payload;
- пишет records обратно при restore;
- не содержит scoring/validation правил.

`WorkspaceSyncCenter.vue` отображает state и вызывает facade actions:

- refresh snapshot;
- copy workspace JSON;
- paste/import package;
- restore package.

## Workspace Contract

Новый package contract:

```ts
const WORKSPACE_CONTRACT_VERSION = 'academy-workspace/v1'

interface AcademyWorkspacePackage {
  contract_version: 'academy-workspace/v1'
  exported_at: string
  source: {
    catalog_version: string
    catalog_generated_at: string
    session_key?: string
  }
  records: WorkspaceRecord[]
}

interface WorkspaceRecord {
  key: string
  group: WorkspaceRecordGroup
  value: unknown
  sizeBytes: number
  status: 'ready' | 'warning' | 'blocked'
}
```

Поддерживаемые groups v1:

- `portal` — активная surface;
- `catalog` — Lesson Hub, Release Console, Lesson Launcher, Authoring selection/drafts;
- `session` — Session Workspace imports;
- `delivery` — Cockpit, Delivery Control Room, Evidence Ledger;
- `student` — Student Launchpad и Submission Inbox;
- `review` — Review/Assessment/Post-Lesson derived inputs;
- `unknown` — разрешенный prefix, который не удалось классифицировать точно.

## Allowed Storage Prefixes

Sync Center должен экспортировать только portal-owned keys:

```text
academy-portal-surface
academy-lesson-hub:
lesson-launcher:
lesson-authoring-selection:
lesson-authoring:
release-console:
session-workspace:
mentor-cockpit:
delivery-control-room:
evidence-ledger:
student-launchpad:
submission-inbox:
academy-dashboard-mode:
```

V1 intentionally не экспортирует произвольные localStorage keys, чтобы не утянуть чужие пользовательские данные.

## Validation Rules

Blockers:

- package не JSON;
- `contract_version` не `academy-workspace/v1`;
- `records` отсутствует или не массив;
- record без строкового `key`;
- record key не входит в allowed prefixes.

Warnings:

- package пустой;
- record value равен `null`;
- record size больше `250 KB`;
- package catalog metadata не совпадает с текущим catalog;
- import содержит keys, которых нет в текущем snapshot.

Readiness:

- `blocked`, если есть хотя бы один blocker;
- `needs-review`, если blockers нет, но есть warnings;
- `ready`, если package валиден и warnings нет.

## Restore Semantics

Restore в v1 работает как explicit overwrite:

- writes только keys из import package;
- не удаляет local keys, которых нет в package;
- не применяет package с blockers;
- показывает preview: create/update counts;
- после restore вызывает refresh snapshot.

Это безопаснее полного “wipe and restore” и достаточно для переносимого backup.

## Error And Empty States

- Если localStorage недоступен, экран показывает degraded state и пустой package.
- Если snapshot пустой, export package остается валидным, но readiness `needs-review`.
- Если import textarea пустая, preview не показывается.
- Если import JSON поврежден, validation показывает blocker без runtime error.
- Если Clipboard API недоступен, workspace JSON и Markdown остаются в textarea для ручного копирования.

## Testing Plan

Unit/contract:

- `tests/workspace-sync-state.test.mjs`;
- snapshot группирует known prefixes;
- export package содержит contract, source и records;
- validation отклоняет bad JSON/version/unknown keys;
- restore preview считает create/update;
- Markdown summary содержит groups и warnings;
- navigation включает `sync`;
- architecture contract знает новые файлы и CSS.

E2E:

- открыть `Workspace Sync Center` из global navigation;
- увидеть heading, snapshot summary, records, validation, import/restore, PR bundle;
- создать local signal через Authoring Studio или Session Workspace;
- экспортировать package;
- вставить package в import textarea;
- увидеть valid preview;
- нажать restore и увидеть restored status;
- desktop/mobile без horizontal overflow.

Quality:

- каждый модуль ниже `400` SLOC;
- avg clustering import graph не выше `0.180`;
- `npm run check`;
- `npm run build`;
- Browser QA на production preview.

## Implementation Order

1. RED tests для pure state builder.
2. GREEN implementation `workspace-sync-state.ts`.
3. RED tests для navigation, architecture и e2e.
4. Wire `sync` в `Global Navigation` и `AcademyPortal`.
5. Реализовать `useWorkspaceSyncState.ts`.
6. Реализовать `WorkspaceSyncCenter.vue` и CSS.
7. Обновить README.
8. Полный verification, PR, merge, release `v0.10.0`.

## Acceptance Criteria

- Ментор может открыть `Workspace Sync Center` из global navigation.
- Экран показывает records по groups, package size, validation и PR bundle.
- Export package содержит только разрешенные portal-owned localStorage keys.
- Import package проходит validation и показывает restore preview.
- Restore пишет только keys из package и не чистит чужие данные.
- Sync surface работает без валидной session, но требует валидный catalog.
- Desktop/mobile e2e pass.
- `npm run check`, `npm run build`, `git diff --check` pass.
