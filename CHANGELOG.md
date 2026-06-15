# Changelog

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
