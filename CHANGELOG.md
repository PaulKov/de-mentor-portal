# Changelog

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
