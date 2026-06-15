# Lesson Authoring Studio v1 Design

## Контекст

Портал уже умеет проводить урок, собирать evidence, принимать домашку, оценивать skill mastery и закрывать занятие через `Post-Lesson Pack`. После релиза `Mentor Mission Control` у ментора появился единый операционный экран для проведения уже подготовленного урока.

Следующий узкий участок находится раньше в lifecycle: создание и проверка урока все еще остается ближе к JSON, Markdown и ручной дисциплине автора. Это плохо масштабируется, когда направлений станет больше: `Greenplum`, `ClickHouse`, `Hadoop`, `Spark`, `Postgres`.

## Цель

Добавить `Lesson Authoring Studio` как новую portal surface, которая помогает ментору собрать, проверить и экспортировать lesson/session пакет без ручного обхода контрактов.

Экран должен отвечать на четыре вопроса:

- из каких stage состоит урок;
- какие команды, вопросы, evidence и homework есть на каждом участке;
- готов ли урок к проведению по quality gate;
- что экспортировать в `academy-catalog/v1`, `academy-session/v1` и PR/release summary.

## Не цели v1

- Не делать backend persistence, shared database и multi-user editing.
- Не делать полноценный drag-and-drop конструктор.
- Не редактировать файлы репозитория напрямую из браузера.
- Не генерировать презентации или Google Slides из UI.
- Не заменять существующие docs/runbooks как source of truth.
- Не строить universal CMS для всех будущих курсов.

## UX-модель

`Lesson Authoring Studio` открывается как рабочий экран автора урока, а не landing page.

Верх экрана:

- текущий lesson title и track;
- readiness score;
- количество blockers/warnings;
- primary action `Скопировать lesson package`.

Основные зоны:

1. `Blueprint` — структура урока: metadata, stages, total minutes, audience, objective.
2. `Stage Matrix` — таблица stage-by-stage: duration, slide hint, mentor action, student action, command, question, evidence.
3. `Quality Gate` — валидатор completeness и teaching-readiness.
4. `Preview` — как этот урок будет выглядеть в mentor/student маршрутах.
5. `Export` — copy-ready JSON/Markdown артефакты.

## Навигация

Добавить новую `PortalSurface`: `authoring`.

Порядок в `Global Navigation`:

```text
hub -> authoring -> mission-control -> release -> workspace -> session -> review -> assessment -> submission -> cohort -> post-lesson
```

Route guard:

- `authoring` требует валидный catalog, потому что v1 стартует от выбранного урока из каталога;
- валидная session не обязательна;
- если catalog невалиден, пользователь остается в `hub`/diagnostic state.

## Архитектура

Новая feature-зона:

```text
features/lesson-authoring/
  LessonAuthoringStudio.vue
  lesson-authoring-state.ts
  useLessonAuthoringState.ts
assets/css/lesson-authoring.css
```

`lesson-authoring-state.ts` является чистым state-builder:

- принимает `AcademyCatalog`, выбранные `trackId` и `lessonId`;
- строит editable draft из catalog lesson;
- рассчитывает quality gate;
- строит preview для mentor/student маршрутов;
- формирует export payloads.

`useLessonAuthoringState.ts` остается тонким фасадом:

- хранит локальный draft в `localStorage`;
- нормализует поврежденный payload;
- не содержит правил quality gate.

`LessonAuthoringStudio.vue` только отображает state и эмитит команды:

- select track/lesson;
- update draft fields;
- reset draft from catalog;
- copy export.

## State Contract

Основные типы:

```ts
type AuthoringSeverity = 'blocker' | 'warning' | 'ok'
type AuthoringReadiness = 'ready' | 'needs-work' | 'blocked'

interface LessonAuthoringState {
  title: string
  subtitle: string
  readiness: AuthoringReadiness
  readinessScore: number
  selectedTrackId: string
  selectedLessonId: string
  draft: LessonAuthoringDraft
  blueprint: AuthoringBlueprint
  stageRows: AuthoringStageRow[]
  qualityChecks: AuthoringQualityCheck[]
  preview: AuthoringPreview
  exports: AuthoringExports
}
```

`LessonAuthoringDraft` в v1 хранит только browser-local overrides:

- title;
- objective;
- totalMinutes;
- stage titles;
- stage durations;
- mentor actions;
- student actions;
- commands;
- questions;
- evidence checks;
- homework tasks.

## Quality Gate Rules

Quality gate должен быть deterministic и объяснимым:

Blockers:

- нет stages;
- сумма stage duration равна `0`;
- stage без mentor action;
- stage без student action;
- stage без evidence check;
- homework пустая;
- total minutes больше `90` или меньше `30`;
- выбранный lesson отсутствует в catalog.

Warnings:

- stage без runnable command;
- stage без question;
- stage duration больше `20` минут;
- evidence checks меньше количества stages;
- нет student prep resource;
- нет next lesson hint.

Score:

```text
100 - blockers * 18 - warnings * 7
```

Минимальное значение `0`, максимальное `100`.

Readiness:

- `blocked`, если есть хотя бы один blocker;
- `needs-work`, если blockers нет, но есть warnings или score меньше `85`;
- `ready`, если blockers нет и score не ниже `85`.

## Preview

Preview не должен дублировать все существующие screens. Он показывает компактную проверку:

- `Mentor route`: stages, commands, questions, evidence.
- `Student route`: objective, prep, commands, homework.
- `Mission Control impact`: что улучшится после устранения blockers/warnings.

## Export

В v1 export остается copy/download-first:

- `catalogPatchMarkdown` — human-readable summary для PR;
- `lessonPackageJson` — JSON draft, совместимый по смыслу с `academy-catalog/v1`;
- `sessionSeedJson` — starter session payload для локального dry-run;
- `qualityReportMarkdown` — отчет по blockers/warnings.

UI не пишет файлы напрямую. Это сохраняет границу ответственности браузера и repo.

## Error And Empty States

- Если catalog не загрузился, Authoring Studio показывает диагностический блок и link/action к `Lesson Hub`.
- Если lesson не выбран, выбирается первый доступный lesson из первого track.
- Если localStorage поврежден, draft сбрасывается к catalog-derived default.
- Если lesson partial, экран остается полезным и показывает blockers вместо runtime errors.
- Если Clipboard API недоступен, export textarea остается видимой для ручного копирования.

## Testing Plan

Unit/contract:

- `tests/lesson-authoring-state.test.mjs`;
- draft строится из sample catalog;
- blockers/warnings считаются детерминированно;
- readiness меняется после полного draft;
- export markdown/json содержит lesson title, stage matrix и quality gate;
- navigation включает `authoring`;
- architecture contract знает новые файлы и CSS.

E2E:

- открыть `Lesson Hub`;
- перейти в `Lesson Authoring Studio`;
- увидеть heading, readiness score, stage matrix, quality gate, preview и export;
- изменить stage duration/question/evidence;
- убедиться, что readiness пересчитался;
- проверить desktop/mobile без horizontal overflow.

Quality:

- каждый модуль ниже `400` SLOC;
- avg clustering import graph не выше `0.180`;
- `npm run check`;
- `npm run build`;
- Browser QA на production preview.

## Implementation Order

1. RED tests для state builder.
2. GREEN implementation чистого state builder.
3. RED tests для navigation, architecture и e2e.
4. Wire `authoring` в `Global Navigation` и `AcademyPortal`.
5. Реализовать `useLessonAuthoringState.ts`.
6. Реализовать `LessonAuthoringStudio.vue` и CSS.
7. Обновить README.
8. Полный verification, PR, merge, release `v0.9.0`.

## Acceptance Criteria

- Ментор может открыть `Lesson Authoring Studio` из global navigation.
- Экран показывает blueprint, stage matrix, quality gate, preview и export.
- Quality gate объясняет blockers/warnings и readiness score.
- Изменения draft пересчитывают readiness без перезагрузки страницы.
- Export artifacts можно скопировать из UI.
- Authoring surface работает без валидной session, но требует валидный catalog.
- Desktop/mobile e2e pass.
- `npm run check`, `npm run build`, `git diff --check` pass.
