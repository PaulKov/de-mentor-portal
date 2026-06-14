# Student Self-Service Launchpad Design

## Цель

Добавить в портал второй рабочий режим: **Student Launchpad**. Ученик должен открыть тот же session-driven UI и без помощи ментора понять, что подготовить, какие материалы открыть, какие команды выполнить и как проверить готовность окружения на macOS, Windows/WSL2 и Linux.

## Пользовательский сценарий

1. Ментор или ученик запускает портал с `session.json`.
2. В верхней части валидной сессии доступен переключатель `Ментор` / `Ученик`.
3. Режим `Ментор` оставляет текущий `Mentor Live Cockpit` без изменения сценария проведения урока.
4. Режим `Ученик` показывает:
   - подготовку окружения по платформам `macOS`, `Windows + WSL2`, `Linux`;
   - ссылки и пути на `student-prep`, `workbook`, `homework`, артефакты урока и следующий урок;
   - команды запуска портала и self-check из `control_plane.student_mode` и `control_plane.portal_actions`;
   - понятный handoff: что принести ментору после самостоятельного запуска.

## Архитектура

Фича остается в существующем Nuxt/Vue портале и не меняет session contract. Данные берутся из уже существующего `control_plane.student_mode`, `portal_actions`, `artifacts` и `next_lesson`.

- `features/session-dashboard` хранит только выбор режима и маршрутизацию между mentor/student surfaces.
- `features/student-launchpad` содержит чистый state builder, composable persistence facade и UI-компоненты student mode.
- `components/shared/ui` продолжает содержать только переиспользуемые элементы без знания домена.
- `assets/css/student-launchpad.css` хранит визуальные стили новой поверхности, чтобы не раздувать `cockpit.css`.

## UI-модель

Student mode не является лендингом. Первый экран сразу полезный:

- compact topbar с названием урока, статусом `session.json` и переключателем режима;
- readiness-панель с platform tabs и чеклистом команд;
- ресурсная колонка: prep, workbook, homework, Google Slides/SQL artifacts, next lesson;
- self-check блок с copy-ready командами;
- handoff блок с ожидаемыми evidence items.

Стиль остается светлым, спокойным и близким к текущему порталу: белый фон, тонкие borders, умеренные акценты, без маркетинговых hero-блоков и декоративных перегрузов.

## Состояние и persistence

Выбранный режим dashboard сохраняется отдельно от mentor notes:

```text
session-dashboard-mode:<contract_version>:<lab_name>:<student_name>:<created_at>
```

Выбранная платформа student readiness сохраняется отдельно:

```text
student-launchpad:<contract_version>:<lab_name>:<student_name>:<created_at>
```

Storage adapter остается `createSafeLocalStoragePort`, чтобы SSR и браузеры без storage деградировали безопасно.

## Проверки

Работа идет через TDD:

- unit tests для `student-launchpad-state.ts`;
- unit tests для dashboard mode persistence key/normalization;
- architecture contract на новые файлы и CSS;
- e2e: mentor mode по умолчанию, переключение в student mode, видимость prep/workbook/homework/self-check, выбор Windows/WSL2 и persistence после reload;
- полный preflight: `npm run test`, `npm run validate:session -- public/session.sample.json`, `npm run build`, `npm run test:e2e`, `npm run check`, `git diff --check`.

## Не делаем в этом инкременте

- Не добавляем backend авторизацию или роли.
- Не меняем JSON contract и генератор `session.json`.
- Не делаем отдельный student portal repository.
- Не реализуем реальное выполнение команд из браузера; портал показывает copy-ready команды и чеклисты.
