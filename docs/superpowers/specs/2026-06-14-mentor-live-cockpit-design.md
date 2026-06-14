# Mentor Live Cockpit Design

## Цель

Сделать в `de-mentor-portal` первый профессиональный режим для ментора: один экран, с которого можно вести урок без постоянного переключения между runbook, презентацией, CLI-командами, evidence checklist и session report.

Первый целевой урок для MVP: `greenplum-partitioning`, но решение должно работать от общего `academy-session/v1` payload и не хардкодить Lesson 02 в UI.

## Утвержденный Scope

В MVP входят четыре блока:

- **Stage Player**: текущий этап, timebox, mentor script, вопрос ученику, expected answer, verification rule, previous/next stage.
- **Slides + Commands Rail**: slide anchors, Google Slides link, command queue, copy buttons, dry-run/live labels.
- **Evidence Panel**: чеклист понимания, локальные отметки ментора, live notes, intervention prompts, export-ready summary.
- **Release Status Strip**: компактный статус manifest/session/slides/links, чтобы ментор видел готовность урока перед началом.

MVP намеренно не делает:

- запуск SQL или shell-команд из браузера;
- backend persistence для mentor notes;
- многопользовательский realtime;
- полноценную release console;
- редактирование `session.json` из UI;
- LMS, auth, billing, роли и серверную историю занятий.

## Пользовательский Сценарий

Ментор запускает core CLI:

```bash
python3 mentor-lab.py session greenplum-partitioning start --student Иван --output artifacts/sessions/ivan
MENTOR_LAB_SESSION=/absolute/path/to/session.json npm run dev
```

Портал открывает Mentor Live Cockpit:

- слева показывает stage rail с таймингом и текущим stage;
- в центре показывает карточку текущего stage и команды;
- справа показывает slides/evidence/interventions;
- сверху показывает health strip: session contract, source, Google Slides metadata, route readiness;
- локальные отметки и заметки ментора сохраняются в `localStorage` по ключу session identity.

## Данные

Источник данных остается прежним:

- `/api/session`;
- `/session.json`;
- `/session.sample.json`.

Основные поля:

- `current_stage`;
- `stages`;
- `commands`;
- `skill_graph`;
- `events`;
- `portal`;
- `control_plane.mentor_mode.stage_guides`;
- `control_plane.mentor_mode.google_slides`;
- `control_plane.mentor_mode.slide_deck`;
- `control_plane.artifacts`.

Если `control_plane` отсутствует, cockpit должен деградировать до базового режима:

- stage player берет данные из `current_stage` и `stages`;
- commands rail берет `commands`;
- evidence panel берет `skill_graph`;
- release strip показывает warning “control plane missing”.

## UI Архитектура

Новые фичи живут отдельно от текущего dashboard:

- `features/mentor-cockpit/MentorCockpit.vue` — композиция режима.
- `features/mentor-cockpit/StagePlayer.vue` — текущий stage и навигация.
- `features/mentor-cockpit/SlideCommandRail.vue` — слайды и команды.
- `features/mentor-cockpit/EvidencePanel.vue` — чеклист, notes, interventions.
- `features/mentor-cockpit/ReleaseStatusStrip.vue` — компактный preflight/status блок.
- `features/mentor-cockpit/useMentorCockpitState.ts` — computed state и localStorage facade.
- `core/session/domain/control-plane.ts` — типы control plane, если текущих типов недостаточно.
- `shared/utils/local-storage.ts` — порт для локальных отметок и notes.

`app.vue` остается тонким фасадом. `SessionDashboard.vue` либо становится shell для выбора режима, либо делегирует в `MentorCockpit.vue`, если session валидна.

## Визуальный Стиль

Стиль остается в текущей светлой теме портала:

- фон `#f7f7f5`;
- белые рабочие поверхности;
- радиус не больше `8px`;
- спокойная палитра с зеленым accent;
- плотная инженерная подача без hero/marketing-композиции;
- больше рабочей информации на первом экране, но без вложенных cards внутри cards.

Главный экран — это рабочая cockpit-поверхность, не landing page.

## Локальное Состояние

В MVP локально сохраняются:

- выбранный stage, если ментор вручную перешел вперед/назад;
- checked evidence items;
- notes по stage;
- отметки “student stuck”, “needs follow-up”, “homework risk”.

Ключ localStorage должен включать:

- `contract_version`;
- `lab_name`;
- `student_name`;
- `created_at`.

Если session поменялась, старые отметки не должны применяться к новой сессии.

## Ошибки И Empty States

Портал должен явно показывать:

- session invalid: список validation issues и кнопку reload;
- control plane missing: warning, но dashboard остается usable;
- no stages: блокирующий warning;
- no commands: пустой command rail с подсказкой проверить core session generation;
- localStorage недоступен: notes не сохраняются, но UI продолжает работать.

## Тестирование

Минимальный набор:

- unit/contract tests на derived cockpit state;
- architecture contract: новые файлы существуют, `app.vue` остается тонким;
- session contract test: sample содержит `control_plane` или fallback покрыт тестом;
- Playwright desktop: видны Stage Player, command rail, evidence panel, release strip;
- Playwright mobile: stage rail и current stage доступны без горизонтального overflow;
- localStorage test: отметка evidence сохраняется после reload;
- visual smoke через Playwright screenshot для desktop/mobile.

Команды:

```bash
npm run test
npm run validate:session -- public/session.sample.json
npm run build
npm run test:e2e
npm run check
```

## Критерии Приемки

MVP считается готовым, если:

- ментор может открыть портал и провести Lesson 02 по stage без чтения markdown runbook;
- текущий stage показывает script, question, expected answer, verification и команды;
- Google Slides link и slide anchors доступны рядом со stage;
- evidence checklist можно отмечать локально, отметки переживают reload;
- session invalid/missing control plane отображаются понятно;
- `npm run check` проходит локально и в CI;
- каждый новый модуль остается меньше 400 SLOC;
- UI не ломается на desktop `1440x1000` и mobile viewport из Playwright.

## Первый Implementation Cut

Первый PR по implementation должен быть цельным, но небольшим:

- типы control plane;
- `MentorCockpit.vue`;
- `StagePlayer.vue`;
- `SlideCommandRail.vue`;
- `EvidencePanel.vue`;
- `ReleaseStatusStrip.vue`;
- localStorage adapter;
- tests and README update.

После этого отдельными PR можно добавлять richer release console, student workspace и backend persistence.
