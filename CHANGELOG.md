# Changelog

## v0.10.0 - 2026-06-15

Релиз workspace sync automation: портал получил self-service backup/restore для browser-local состояния и PR-ready workspace handoff.

### Добавлено

- `Workspace Sync Center`: новая catalog-first поверхность после `Lesson Authoring Studio`.
- Контракт `academy-workspace/v1` для export/import портального browser-local workspace.
- Snapshot по portal-owned ключам: `academy-portal-surface`, lesson hub/launcher/authoring, release console, session workspace, cockpit, delivery control room, evidence ledger, student launchpad, submission inbox и dashboard mode.
- Import validation: блокировка неверного JSON, неподдержанного `contract_version`, отсутствующих `records` и ключей вне portal scope.
- Restore preview с create/update counts и безопасным restore без удаления unrelated localStorage keys.
- Copy-ready `PR bundle` для handoff по workspace.

### Качество и UX

- Добавлены unit/contract тесты для `features/workspace-sync`.
- Расширены global navigation, architecture contract и Playwright e2e сценарии на desktop/mobile.
- README описывает `Workspace Sync Center`, `academy-workspace/v1`, allowed prefixes и safe restore workflow.
- Все новые модули удержаны ниже `400` SLOC; avg clustering guard остается зеленым.
- Browser QA выполнен на production preview: desktop restore flow, mobile viewport `390x844`, чистая консоль, отсутствие page-level horizontal overflow.

## v0.9.0 - 2026-06-15

Релиз lesson authoring automation: портал теперь помогает ментору собрать, проверить и экспортировать lesson/session пакет до live-сессии.

### Добавлено

- `Lesson Authoring Studio`: catalog-first поверхность для сборки browser-local lesson draft.
- Editable `Stage Matrix`: duration, mentor action, student action, command, question и evidence по каждому stage.
- Deterministic `Quality Gate` с blockers, warnings, readiness score и объяснимыми критериями.
- Mentor/student preview маршрута урока.
- Copy-ready exports: catalog patch Markdown, lesson package JSON, session seed JSON и quality report Markdown.
- Навигация `Lesson Authoring Studio` в `Global Navigation`; surface требует валидный catalog, но не требует валидную session.

### Качество и UX

- Добавлены unit/contract тесты для `features/lesson-authoring`.
- Расширены global navigation, architecture contract и Playwright e2e сценарии на desktop/mobile.
- README описывает authoring workflow, quality gate, export и browser-local ограничения.
- Все новые модули удержаны ниже `400` SLOC, avg clustering guard остается зеленым.
- Browser QA выполнен на production preview: desktop/mobile без horizontal overflow, чистая консоль, interaction обновляет Quality Gate.

## v0.8.0 - 2026-06-15

Релиз mentor mission control: портал получил единый операционный экран, который показывает ментору следующий лучший шаг до урока, во время урока и после него.

### Добавлено

- `Mentor Mission Control`: новый верхнеуровневый экран для управления маршрутом `pre-lesson -> live lesson -> post-lesson`.
- Next best action на базе валидности release/session, статусов evidence ledger, review blockers, homework readiness, skill assessment и post-lesson pack.
- Journey signals: быстрые индикаторы по live evidence, ledger blockers, homework, skill mastery и post-lesson readiness.
- Mission checklist по трем фазам: подготовка, проведение, закрытие урока.
- Focus queue, quick links на ключевые поверхности портала и copy-ready Markdown export mission report.

### Качество и UX

- Добавлены unit/contract тесты для `features/mission-control`.
- Расширены global navigation guards и Playwright e2e сценарии на desktop/mobile.
- README описывает назначение Mission Control и его место в менторском workflow.
- Все новые модули удержаны ниже `400` SLOC и используют существующие state builders без дублирования логики.
- Browser/Playwright QA выполнен на production preview: desktop/mobile без horizontal overflow, чистая консоль.

## v0.7.0 - 2026-06-15

Релиз learning-path automation: портал теперь оценивает освоение навыков после урока и помогает ментору выбрать фокус следующей встречи.

### Добавлено

- `Skill Assessment Center`: отдельная поверхность портала для оценки `skill_graph` по уровням `not-started`, `aware`, `can-repeat`, `can-explain`, `can-apply`.
- Mastery scoring на базе трех источников: evidence из `Mentor Live Cockpit`, stage status/blockers из `Lesson Run Evidence Ledger` и homework evidence из `Submission Inbox`.
- Learning path с focus skills, blockers, next actions и next lesson preview.
- Copy-ready Markdown/JSON export assessment-отчета.
- Навигация `Skill Assessment Center` в `Global Navigation` и route guard по валидной session.

### Качество и UX

- Добавлены unit/contract тесты для `features/assessment-center`.
- Расширены Playwright e2e сценарии на desktop/mobile для полного assessment flow.
- README описывает уровни skill mastery, browser-local источники и рекомендуемый workflow.
- Очищены npm deprecated warnings через обновление Nuxt/Vue и Node 24-compatible dependency overrides.
- CI на `master` после merge PR #20 прошел: unit, session validator, e2e и audit.
- Browser QA выполнен на production preview: desktop/mobile без horizontal overflow, чистая консоль.

## v0.6.0 - 2026-06-15

Релиз post-lesson automation: портал теперь собирает итоговый пакет после урока из живого cockpit, evidence ledger, review center и homework inbox.

### Добавлено

- `Post-Lesson Pack`: единый экран для передачи ученику итогов урока, домашки, next steps и follow-up действий ментора.
- Readiness-модель `ready-to-send` / `needs-attention` на базе evidence, homework completeness, ledger delta и unresolved blockers.
- Markdown/JSON export итогового пакета с lesson summary, learner handoff, homework, next lesson preview и mentor follow-up.
- Навигация `Post-Lesson Pack` в глобальном портале с route guard по активной session.

### Качество и UX

- Добавлены unit/contract тесты для `features/post-lesson-pack`.
- Расширены Playwright e2e сценарии на desktop/mobile для полного post-lesson flow.
- README описывает маршрут `Cockpit -> Ledger -> Review -> Homework -> Post-Lesson Pack`.
- CI на `master` после merge PR #17 прошел: unit, session validator, e2e и audit.

## v0.5.0 - 2026-06-15

Релиз review automation: Ledger стал не отдельным журналом, а источником операционных сигналов для закрытия урока, cohort overview и быстрых команд ментора.

### Добавлено

- `Mentor Review Center` теперь показывает ledger status, planned/actual delta и blockers по каждому stage.
- Review Markdown/JSON включает отдельный блок `Ledger Signals`.
- `Cohort Progress Dashboard` подсвечивает ledger risk/skipped, time overrun и evidence summary в learner cards и Markdown summary.
- `Command Center` получил действие `Скопировать ledger report` для текущей session.

### Качество и UX

- Расширены unit/contract тесты для review, cohort и global navigation state.
- Расширены Playwright e2e сценарии: desktop/mobile, ledger-driven review, cohort signals и Command Center ledger copy.
- README описывает маршрут `Ledger -> Review -> Cohort -> Command Center`.
- CI на `master` после merge PR #16 прошел: unit, session validator, e2e и audit.

## v0.4.0 - 2026-06-15

Релиз evidence ledger: портал начал фиксировать ход живого урока как проверяемый операционный журнал, а не только как набор заметок и checkbox evidence.

### Добавлено

- `Lesson Run Evidence Ledger`: stage-by-stage журнал внутри `Mentor Live Cockpit`.
- Статусы этапов `pending`, `done`, `risk`, `skipped` для быстрого handoff после урока.
- Фактическое время по stage, расчет planned/actual delta и общий счетчик прогресса.
- Blockers по этапам с browser-local persistence.
- Copy-ready `Lesson ledger markdown` с evidence summary, time delta, notes и blockers.

### Качество и UX

- Добавлены unit/contract тесты для `features/evidence-ledger`.
- Расширены Playwright e2e сценарии: desktop/mobile, ledger status, actual time, blocker, Markdown и reload persistence.
- README расширен разделом `Lesson Run Evidence Ledger`.
- Rendered QA выполнен на production preview: чистая консоль, desktop/mobile без horizontal overflow.

## v0.3.0 - 2026-06-15

Релиз проведения урока: портал получил отдельный `Lesson Delivery Control Room`, который помогает ментору держать темп занятия, фиксировать evidence и быстро переключаться в fallback-сценарии без потери контекста.

### Добавлено

- `Lesson Delivery Control Room`: stage timer, прогресс таймбокса, фокусные карточки “что сказать”, “что показать”, “что спросить” и “как проверить”.
- Быстрое evidence-действие из Control Room: ментор может отметить ключевой чек текущего stage, не спускаясь в нижнюю evidence panel.
- Stage note sync: заметка из Control Room синхронизируется с заметкой текущего этапа в `Mentor Live Cockpit`.
- Panic-mode подсказки для ситуаций “стенд не поднялся”, “SQL не работает” и “ученик отстал”.
- Stage-aware команды в `Command Center`: копирование команды и вопроса текущего этапа.

### Качество и UX

- Добавлены unit/contract тесты для `features/delivery-control-room`.
- Расширены Playwright e2e сценарии: desktop/mobile, timer, evidence, note sync, panic-mode и stage-aware Command Center.
- README расширен разделом `Lesson Delivery Control Room`.
- Browser QA выполнен на production preview: чистая консоль, корректный clipboard, отсутствие horizontal overflow на мобильном viewport.

## v0.2.0 - 2026-06-15

Навигационный релиз портала: теперь ментор видит единый верхний слой управления уроком и может быстро переходить между ключевыми поверхностями без поиска кнопок внутри экранов.

### Добавлено

- `Global Navigation`: постоянная верхняя навигация по `Academy Lesson Hub`, `Lesson Release Console`, `Session Workspace`, `Mentor Live Cockpit`, `Mentor Review Center`, `Submission Inbox` и `Cohort Progress Dashboard`.
- `Command Center`: единая панель быстрых действий с переходами по порталу и copyable-командами из `control_plane.portal_actions`.
- Route guards: `Review Center`, `Submission Inbox` и `Cohort Dashboard` блокируются без валидной `session`, а `Mentor Live Cockpit` остается доступен как диагностический экран.
- Горячая клавиша `Cmd/Ctrl + K` для открытия Command Center.

### Качество и UX

- Добавлены unit/contract тесты для `features/global-navigation`.
- Добавлены Playwright сценарии для desktop/mobile Command Center и проверки отсутствия horizontal overflow.
- README расширен разделом `Global Navigation и Command Center`.
- Browser QA выполнен на production preview: desktop и mobile, чистая консоль, корректный переход из Command Center в cockpit.

## v0.1.0 - 2026-06-15

Первый публичный релиз `DE Mentor Portal`: self-service портал для проведения и сопровождения уроков `de-mentor`.

### Добавлено

- `Academy Lesson Hub`: каталог направлений, уроков, материалов, readiness и role-aware команд.
- `Lesson Launcher`: генерация launch-пакета для ментора и ученика с route/platform/output настройками.
- `Session Workspace`: browser-local импорт и валидация `session.json`, recent runs и переключение между сессиями.
- `Mentor Live Cockpit`: проведение занятия, stage player, slides/commands rail, evidence checklist и заметки.
- `Student Launchpad`: подготовка окружения ученика для macOS, Windows + WSL2 и Linux, материалы и self-check.
- `Mentor Review Center`: evidence score, stage review, risks, recommendations и Markdown/JSON handoff.
- `Submission Inbox`: browser-local сдача домашки, completeness scoring и mentor-ready report.
- `Cohort Progress Dashboard`: агрегация live/imported sessions, submissions, risks и skill heatmap.
- `Lesson Release Console`: pre-flight go/no-go, release checks, risks, copyable verification commands и Markdown release report.

### Качество и эксплуатация

- Contract tests для catalog/session/state-моделей.
- Playwright e2e на desktop и mobile.
- Quality guard: каждый source-модуль не больше `400` SLOC, средний clustering import-графа не выше `0.180`.
- Production build через Nuxt/Nitro.
- `npm run check` как единый локальный preflight.

### Осознанные ограничения

- Портал не запускает локальные CLI-команды из браузера: команды копируются и выполняются ментором явно.
- Browser-local данные хранятся в `localStorage`; backend, auth и shared database запланированы как отдельный этап.
- Интеграция с core CLI идет через `academy-catalog/v1` и `academy-session/v1`, без прямой связи с файловой системой из UI.
