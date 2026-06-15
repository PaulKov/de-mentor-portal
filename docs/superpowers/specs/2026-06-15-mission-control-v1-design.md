# Mission Control v1 Design

## Контекст

Портал уже закрывает основные части mentor journey:

- подготовка урока: `Academy Lesson Hub`, `Lesson Launcher`, `Release Console`, `Session Workspace`;
- проведение: `Mentor Live Cockpit`, `Lesson Delivery Control Room`, `Lesson Run Evidence Ledger`;
- закрытие: `Review Center`, `Submission Inbox`, `Skill Assessment Center`, `Post-Lesson Pack`;
- операционный обзор: `Cohort Progress Dashboard`.

Главная проблема следующего слоя: ментор видит много сильных поверхностей, но ему нужен один экран, который отвечает на вопрос “что делать сейчас?”.

## Цель

Добавить `Mentor Mission Control` как новую portal surface, которая собирает текущую session, readiness, live progress, evidence gaps, homework, assessment и post-lesson readiness в единый управляемый обзор.

Экран должен помогать ментору быстро понять:

- в каком состоянии находится текущая session;
- какой следующий лучший action;
- что уже закрыто и что блокирует переход дальше;
- куда перейти для детальной работы.

## Не цели v1

- Не заменять `Academy Lesson Hub` как стартовый экран по умолчанию.
- Не строить backend persistence или shared database.
- Не делать multi-user auth.
- Не дублировать все детали существующих экранов.
- Не превращать Mission Control в новый god module.

## UX-модель

Mission Control показывает один workflow:

1. `Before lesson` — catalog/session/release readiness и launch/session actions.
2. `Live lesson` — текущий stage, ledger status, evidence progress, active blockers.
3. `After lesson` — review, homework, assessment, post-lesson packet и next lesson readiness.

Верх экрана содержит:

- заголовок `Mentor Mission Control`;
- контекст ученика и урока;
- stage-aware статус;
- primary next action.

Основная сетка:

- `Next Best Action` — один главный action с причиной и кнопкой перехода;
- `Journey Checklist` — Before / Live / After checklist с состояниями `ready`, `open`, `blocked`;
- `Signals` — компактные метрики по evidence, ledger, homework, assessment, unresolved blockers;
- `Focus Queue` — 3-5 задач, которые ментор должен закрыть первыми;
- `Quick Links` — переходы в существующие surfaces.

## Навигация

Добавить новую `PortalSurface`: `mission-control`.

Порядок в `Global Navigation`:

```text
hub -> mission-control -> release -> workspace -> session -> review -> assessment -> submission -> cohort -> post-lesson
```

Route guard:

- `mission-control` доступен при валидной `session`;
- при отсутствии валидной session пользователь остается в `session`, как сейчас для evidence surfaces;
- `Lesson Hub` остается стартовой surface по умолчанию.

## Архитектура

Новая feature-зона:

```text
features/mission-control/
  MissionControl.vue
  mission-control-state.ts
  useMissionControlState.ts
assets/css/mission-control.css
```

`mission-control-state.ts` является чистым state-builder и не зависит от Vue/browser.

`useMissionControlState.ts` является тонким browser-local фасадом. Он читает те же ключи, что уже используют соседние surfaces:

```text
mentor-cockpit:<contract_version>:<lab_name>:<student_name>:<created_at>
evidence-ledger:<contract_version>:<lab_name>:<student_name>:<created_at>
submission-inbox:<contract_version>:<lab_name>:<student_name>:<created_at>
```

Mission Control должен переиспользовать существующие builders:

- `buildEvidenceLedgerState`;
- `buildReviewCenterState`;
- `buildSubmissionInboxState`;
- `buildAssessmentCenterState`;
- `buildPostLessonPackState`.

Такой подход сохраняет DRY: Mission Control агрегирует решения, но не пересчитывает правила чужих features.

## State Contract

Основные типы:

```ts
type MissionPhase = 'before' | 'live' | 'after'
type MissionStatus = 'ready' | 'open' | 'blocked'

interface MissionControlState {
  title: string
  phase: MissionPhase
  nextAction: MissionAction
  checklist: MissionChecklistSection[]
  signals: MissionSignal[]
  focusQueue: MissionAction[]
  quickLinks: MissionQuickLink[]
  reportMarkdown: string
}
```

`MissionAction` содержит:

- `code`;
- `title`;
- `description`;
- `targetSurface`;
- `status`;
- `priority`.

## Next Best Action Rules

Приоритеты v1:

1. Если session невалидна — перейти в diagnostic `Mentor Live Cockpit`.
2. Если release/catalog readiness не готов — открыть `Release Console`.
3. Если live lesson не закрыт по ledger — открыть `Mentor Live Cockpit`.
4. Если есть ledger blockers — открыть `Review Center`.
5. Если homework не ready-for-review — открыть `Submission Inbox`.
6. Если assessment focus skills > 0 — открыть `Skill Assessment Center`.
7. Если post-lesson pack readiness `needs-attention` — открыть `Post-Lesson Pack`.
8. Иначе — предложить переход к next lesson planning.

Для v1 достаточно deterministic rules. ML/AI recommendations не нужны.

## UI Details

Визуальный стиль должен оставаться светлым, спокойным и совместимым с текущим OpenAI-like интерфейсом портала:

- не использовать hero/landing layout;
- не использовать decorative blobs/orbs/gradients;
- карточки только для отдельных repeated items;
- card radius не больше `8px`;
- типографика плотная, рабочая, без marketing-scale headings внутри панелей;
- все grid-блоки должны иметь responsive constraints;
- mobile layout должен быть одноколоночным без horizontal overflow.

## Error And Empty States

Mission Control должен быть полезен даже при неполных данных:

- нет submission state: показывать homework как `open`, а не ошибку;
- нет checked evidence: показывать evidence progress `0%`;
- нет blockers: показывать “Открытых blockers нет”;
- нет next lesson: показывать “Next lesson не настроен”;
- storage payload поврежден: использовать normalize-функции существующих features.

## Testing Plan

Unit/contract:

- `tests/mission-control-state.test.mjs`;
- deterministic next action priority;
- aggregation from ledger, submission, assessment and post-lesson pack;
- empty state with no local storage;
- architecture contract includes new files and CSS;
- global navigation includes `mission-control`.

E2E:

- open current session;
- open `Mentor Mission Control`;
- verify heading, phase, next action, signals and quick links;
- simulate evidence/ledger/homework/assessment signals and verify next action changes;
- desktop and mobile projects;
- no horizontal overflow.

Quality:

- every module below `400` SLOC;
- import graph avg clustering below `0.180`;
- `npm run check`;
- `npm run build`;
- Browser QA on production preview.

## Implementation Order

1. Add RED tests for state, navigation, architecture and e2e.
2. Implement `mission-control-state.ts`.
3. Implement `useMissionControlState.ts`.
4. Implement `MissionControl.vue`.
5. Add CSS and Nuxt registration.
6. Wire surface into `Global Navigation` and `AcademyPortal`.
7. Update README and CHANGELOG only when releasing.
8. Run verification, open PR, merge after green CI.

## Acceptance Criteria

- Mentor can open `Mission Control` from global navigation.
- The page shows one clear next best action.
- The page shows before/live/after checklist.
- The page shows compact signals for evidence, ledger, homework, assessment and post-lesson readiness.
- Buttons navigate to existing surfaces without duplicating their detailed logic.
- Empty and partial localStorage states are graceful.
- Desktop/mobile e2e pass.
- `npm run check`, `npm run build`, `git diff --check` pass.
