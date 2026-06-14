# DE Mentor Portal

Портал самообслуживания для `Academy Experience v5`: **Academy Lesson Hub**, **Lesson Launcher**, **Session Workspace**, **Lesson Release Console**, **Cohort Progress Dashboard**, **Mentor Review Center**, **Submission Inbox**, **Mentor Live Cockpit**, **Student Launchpad**, текущий этап занятия, презентация, команды, evidence checklist, заметки ментора, сдача домашки и handoff-отчет для уроков `de-mentor`.

Портал отделен от core-репозитория намеренно: `de-mentor` генерирует учебные стенды, SQL, docs, `catalog.json` и `session.json`, а `de-mentor-portal` независимо развивается как frontend-сервис на Vue 3 + Nuxt 3 + Vite.

## Оглавление

- [Быстрый старт](#быстрый-старт)
- [Academy Lesson Hub](#academy-lesson-hub)
- [Lesson Launcher](#lesson-launcher)
- [Session Workspace](#session-workspace)
- [Lesson Release Console](#lesson-release-console)
- [Cohort Progress Dashboard](#cohort-progress-dashboard)
- [Mentor Review Center](#mentor-review-center)
- [Submission Inbox](#submission-inbox)
- [Mentor Live Cockpit](#mentor-live-cockpit)
- [Student Launchpad](#student-launchpad)
- [Контракт каталога](#контракт-каталога)
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

По умолчанию портал берет каталог уроков из `public/catalog.sample.json`, а текущую live-сессию из `public/session.sample.json`.

Для реального набора уроков передайте catalog-файл из core CLI или другого publishing pipeline:

```bash
ACADEMY_CATALOG=/absolute/path/to/catalog.json npm run dev
```

Для реального занятия передайте session-файл из core CLI:

```bash
MENTOR_LAB_SESSION=/absolute/path/to/session.json npm run dev
```

Можно создать локальный `.env` из `.env.example` и прописать путь там.

## Academy Lesson Hub

`Academy Lesson Hub` — первый экран портала. Он показывает учебные направления, уроки, роли `Ментор` / `Ученик`, материалы, readiness-пункты и команды запуска без необходимости помнить структуру core-репозитория.

На sample-каталоге уже видны направления:

- `Greenplum`
- `ClickHouse`
- `Hadoop`
- `Spark`
- `Postgres`

Хаб решает две задачи:

- ментор быстро выбирает направление и видит, какие материалы, runbook-команды и проверки нужны для урока;
- ученик получает тот же каталог, но в student-friendly режиме с подготовкой окружения, workbook/homework и командами self-check.

Выбор направления, урока и роли сохраняется локально:

```text
academy-lesson-hub:<contract_version>:<generated_at>
```

Кнопка `Открыть текущую сессию` переводит из каталога в live-экран занятия. Последняя выбранная поверхность портала сохраняется в браузере, поэтому перезагрузка во время урока не возвращает ментора обратно в каталог.

## Lesson Launcher

`Lesson Launcher` — рабочий блок внутри `Academy Lesson Hub`, который превращает выбранный урок в готовый launch-пакет. Ментор выбирает route, платформу ученика, имя ученика и папку session, а портал сразу показывает copyable-команды:

- создание `session.json`;
- mentor runbook;
- student runbook;
- self-check.

Браузер намеренно не запускает локальные CLI-команды сам: это защищает машину пользователя и оставляет контроль у ментора. Портал генерирует точные команды, которые можно скопировать в терминал.

Для работы launcher урок должен содержать optional-блок `launcher` в `academy-catalog/v1`:

```json
{
  "launcher": {
    "lab": "greenplum",
    "default_route": "simple",
    "default_platform": "macos",
    "default_output_dir": "artifacts/sessions/lesson01-greenplum",
    "routes": [
      {
        "code": "simple",
        "title": "Simple path",
        "description": "60-minute route for first lesson delivery.",
        "timebox": "60 min",
        "session_route": "simple",
        "mentor_command": "python3 mentor-lab.py runbook greenplum simple",
        "student_command": "python3 mentor-lab.py runbook greenplum homework",
        "check_command": "python3 mentor-lab.py check greenplum"
      }
    ],
    "platforms": [
      {
        "code": "windows-wsl2",
        "title": "Windows + WSL2",
        "checks": ["wsl --status", "docker --version"],
        "notes": ["Use a WSL distro shell and enable Docker Desktop WSL integration."]
      }
    ]
  }
}
```

Состояние launcher сохраняется локально по выбранному уроку:

```text
lesson-launcher:<generated_at>:<track_code>:<lesson_code>
```

## Session Workspace

`Session Workspace` — реестр recent runs для ментора. Он нужен, когда за день есть несколько учеников, несколько маршрутов или несколько локальных `session.json`, а переключать `MENTOR_LAB_SESSION` ради каждого просмотра неудобно.

Рабочий поток:

- открыть `Academy Lesson Hub`;
- нажать `Открыть сессии`;
- импортировать файл `artifacts/sessions/<student>/session.json`;
- выбрать run и открыть его в `Mentor Live Cockpit`.

Импорт является browser-local: файл читается JavaScript-кодом в текущем браузере, валидируется через `AcademySessionContractValidator`, сохраняется в `localStorage` и не отправляется на backend. Это удобно для локальных занятий и не требует отдельного сервера хранения.

Recent runs сохраняются по ключу:

```text
session-workspace:academy-session/v1
```

Когда workspace-сессия открывается в cockpit, источник состояния выглядит так:

```text
workspace:<student_name>:<lab_name>
```

Кнопка `Открыть текущую live-сессию` возвращает к session-файлу, который сервер Nuxt отдал через `MENTOR_LAB_SESSION`, `public/session.json` или `public/session.sample.json`.

## Lesson Release Console

`Lesson Release Console` — pre-flight экран перед занятием. Он берет `academy-catalog/v1`, текущую `session.json` и `control_plane`, затем показывает go/no-go статус по каждому уроку.

Console проверяет:

- статус урока и readiness markers из каталога;
- deck / Google Slides;
- workbook и homework;
- SQL-lab artifacts;
- mentor/student runbook и self-check команды;
- наличие `Lesson Launcher` для выбранного урока.

Экран не запускает команды в браузере. Он показывает точные copyable-команды проверки (`mentor-lab.py`, `npm run check`, `npm run build`) и Markdown release-report, который можно положить в рабочий журнал или PR description.

Рекомендуемый workflow:

1. Открыть `Academy Lesson Hub`.
2. Нажать `Release Console`.
3. Проверить текущий урок и соседние planned lessons.
4. Если статус `blocked`, закрыть missing artifacts в core-репозитории.
5. Скопировать Markdown release-report перед занятием.

## Cohort Progress Dashboard

`Cohort Progress Dashboard` — операционный экран ментора по ученикам и recent runs. Он агрегирует current live session, imported sessions из `Session Workspace`, browser-local evidence из `Mentor Live Cockpit` и homework submissions из `Submission Inbox`.

Dashboard показывает:

- количество learners и средний evidence score;
- сколько submissions готовы к review;
- учеников с открытыми risks/gaps;
- learner cards с текущим stage, next lesson, submission status и evidence gaps;
- skill heatmap по `skill_graph`;
- copyable Markdown для next actions.

Первый релиз намеренно остается browser-local: портал не отправляет данные на backend и не требует отдельной базы. Источники берутся из существующих ключей:

```text
session-workspace:academy-session/v1
mentor-cockpit:<contract_version>:<lab_name>:<student_name>:<created_at>
submission-inbox:<contract_version>:<lab_name>:<student_name>:<created_at>
```

Рекомендуемый workflow:

1. Импортировать несколько `session.json` в `Session Workspace` или открыть текущую live-сессию.
2. В cockpit отметить evidence и stage notes.
3. В `Submission Inbox` принять homework evidence ученика.
4. Открыть `Cohort Progress Dashboard` и отфильтровать learners с risks или ready submissions.
5. Скопировать Markdown summary в рабочий журнал или план следующей встречи.

## Mentor Review Center

`Mentor Review Center` — экран закрытия урока. Он берет выбранную session, читает browser-local заметки и отмеченные evidence items из `Mentor Live Cockpit`, затем собирает понятный handoff:

- evidence score по `skill_graph`;
- stage review с вопросами, проверками и заметками ментора;
- сильные сигналы;
- открытые риски;
- рекомендации ученику;
- следующий урок из `control_plane.next_lesson`;
- copyable Markdown и JSON export.

Данные review не уходят на backend. Портал читает тот же ключ, который использует cockpit:

```text
mentor-cockpit:<contract_version>:<lab_name>:<student_name>:<created_at>
```

Рекомендуемый workflow после занятия:

1. В cockpit отметить evidence и записать короткие stage notes.
2. Нажать `Открыть review`.
3. Проверить score, risks и recommendations.
4. Скопировать Markdown-отчет ученику или в рабочий журнал.
5. Скопировать JSON, если нужен машинно-читаемый handoff для будущей автоматизации.

## Submission Inbox

`Submission Inbox` закрывает контур после урока: ученик открывает `Student Launchpad`, нажимает `Сдать домашку`, заполняет evidence по self-check, `skill_graph` и готовности к следующему уроку, а ментор видит последнюю сдачу как проверяемый отчет.

Первый релиз работает browser-local и не требует backend:

- checklist строится из `control_plane.student_mode.self_check_commands`, `skill_graph` и `control_plane.next_lesson`;
- completeness считается по заполненным evidence fields;
- status принимает значения `needs-evidence` или `ready-for-review`;
- ментор получает copyable Markdown и JSON для журнала, ревью или будущей автоматизации;
- imported workspace sessions могут открывать свои submissions отдельно от live-сессии.

Данные сохраняются в `localStorage` по ключу session identity:

```text
submission-inbox:<contract_version>:<lab_name>:<student_name>:<created_at>
```

Рекомендуемый workflow для домашки:

1. Ученик выполняет homework и self-check команды.
2. Ученик открывает `Student Launchpad` и нажимает `Сдать домашку`.
3. Ученик вставляет вывод команд, `EXPLAIN`, короткие ответы и ссылки на артефакты.
4. Ментор открывает `Submission Inbox`, сверяет completeness и копирует Markdown-отчет.
5. Открытые gaps переносятся в `Mentor Review Center` и план следующего урока.

## Mentor Live Cockpit

`Mentor Live Cockpit` — экран для проведения конкретной live-сессии. Ментор открывает текущую сессию из хаба и сразу видит:

- выбранный stage, timebox, краткий скрипт, вопрос ученику, ожидаемый ответ и способ проверки;
- ссылку на Google Slides или локальный deck artifact из `control_plane`;
- runnable-команды из stage guide и session contract с кнопкой копирования;
- evidence checklist по ключевым навыкам;
- локальные заметки по текущему stage и отмеченные evidence items.

Чекбоксы evidence и заметки сохраняются в браузерный `localStorage` по ключу session identity:

```text
mentor-cockpit:<contract_version>:<lab_name>:<student_name>:<created_at>
```

Это удобно для живого занятия: перезагрузка страницы не сбрасывает ход урока, но данные не уходят на backend и не смешиваются между разными учениками или сессиями.

## Student Launchpad

`Student Launchpad` — режим самообслуживания ученика в том же портале. Переключатель `Ментор` / `Ученик` находится в верхней части валидной сессии; выбранный режим сохраняется локально по ключу:

```text
session-dashboard-mode:<contract_version>:<lab_name>:<student_name>:<created_at>
```

В режиме ученика портал показывает:

- подготовку окружения для `macOS`, `Windows + WSL2` и `Linux`;
- пути на `student-prep`, `student-workbook`, `homework`, SQL/deck artifacts и следующий урок из `control_plane`;
- команды запуска портала и self-check с копированием в один клик;
- список evidence items, которые ученик должен принести на занятие или после домашки.

Выбранная платформа readiness сохраняется отдельно:

```text
student-launchpad:<contract_version>:<lab_name>:<student_name>:<created_at>
```

Минимальная подготовка ученика:

```bash
docker --version
docker compose version
git --version
python3 --version
node --version
```

Для Windows портал явно ведет по маршруту `Windows + WSL2`: проверить `wsl --status`, включить Docker Desktop WSL integration и выполнять команды урока внутри WSL-дистрибутива.

## Контракт каталога

Портал читает `academy-catalog/v1`.

- компактный contract sample: `contracts/academy-catalog/v1/catalog.sample.json`
- описание contract markers: `contracts/academy-catalog/v1/README.md`
- runtime sample для локального запуска: `public/catalog.sample.json`
- runtime env для реального каталога: `ACADEMY_CATALOG=/path/to/catalog.json`

Порядок источников:

1. `ACADEMY_CATALOG`
2. `public/catalog.json`
3. `public/catalog.sample.json`

Каталог намеренно отделен от `academy-session/v1`: он отвечает за витрину направлений, уроков и self-service материалов, а session contract отвечает за конкретный live-запуск с текущим stage, progress и evidence.

Optional `launcher` metadata в каталоге используется только для подготовки launch-пакета. Если у урока нет `launcher`, портал показывает planned-состояние и не выдумывает команды.

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
- `core/catalog/domain` — типы `AcademyCatalog`, `AcademyTrack`, `CatalogLesson`, константы контракта.
- `core/catalog/application` — `AcademyCatalogContractValidator` и `CatalogLoader`.
- `core/catalog/infrastructure` — адаптеры источников данных, например `HttpCatalogSource`.
- `composables/useSessionState.ts` — тонкий Nuxt-фасад для состояния.
- `composables/useCatalogState.ts` — тонкий Nuxt-фасад для состояния каталога.
- `features/academy-portal` — переключение между catalog-first поверхностью и текущей live-сессией.
- `features/lesson-hub` — витрина направлений, уроков, role-aware команд и readiness.
- `features/lesson-launcher` — генерация launch-пакета, route/platform preferences и copyable команды запуска.
- `features/session-workspace` — browser-local импорт `session.json`, validation, recent runs и выбор session для cockpit.
- `features/release-console` — pre-flight go/no-go, release checks, risks и copyable release report.
- `features/cohort-dashboard` — browser-local cohort aggregation, learner cards, skill heatmap и mentor ops handoff.
- `features/review-center` — evidence score, stage review, risks, recommendations и copyable handoff report.
- `features/submission-inbox` — student homework submission, completeness scoring, mentor inbox и copyable submission report.
- `features/session-dashboard` — композиция основного экрана.
- `features/mentor-cockpit` — live cockpit: stage player, slides/commands rail, evidence panel и local persistence facade.
- `features/student-launchpad` — student self-service: readiness по платформам, материалы, команды запуска, self-check и handoff.
- `features/timeline`, `features/commands`, `features/evidence`, `features/skill-graph`, `features/session-status` — независимые UI-фичи.
- `components/shared/ui` — переиспользуемые Vue-компоненты без знания предметной области.
- `shared/utils` — framework-agnostic утилиты, например clipboard adapter.
- `server/api/catalog.get.ts` — endpoint чтения `ACADEMY_CATALOG`, `public/catalog.json` или sample.
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
- `app.vue`, `composables/useSessionState.ts` и `composables/useCatalogState.ts` остаются тонкими фасадами, а доменная логика живет в `core/session` и `core/catalog`.

## Граница ответственности

- `de-mentor`: lesson contracts, CLI, Docker labs, SQL examples, autograder, docs.
- `de-mentor-portal`: UI, interaction model, academy catalog visualization, session visualization, frontend release cadence.
