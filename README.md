# DE Mentor Portal

Портал самообслуживания для `Academy Experience v5`: **Global Navigation**, **Command Center**, **Mentor Mission Control**, **Academy Lesson Hub**, **Lesson Launcher**, **Session Workspace**, **Lesson Release Console**, **Cohort Progress Dashboard**, **Mentor Review Center**, **Skill Assessment Center**, **Post-Lesson Pack**, **Submission Inbox**, **Mentor Live Cockpit**, **Lesson Delivery Control Room**, **Lesson Run Evidence Ledger**, **Student Launchpad**, текущий этап занятия, презентация, команды, evidence checklist, заметки ментора, оценка skill mastery, сдача домашки и handoff-отчет для уроков `de-mentor`.

Портал отделен от core-репозитория намеренно: `de-mentor` генерирует учебные стенды, SQL, docs, `catalog.json` и `session.json`, а `de-mentor-portal` независимо развивается как frontend-сервис на Vue 3 + Nuxt 4 + Vite.

## Оглавление

- [Быстрый старт](#быстрый-старт)
- [Global Navigation и Command Center](#global-navigation-и-command-center)
- [Mentor Mission Control](#mentor-mission-control)
- [Academy Lesson Hub](#academy-lesson-hub)
- [Lesson Launcher](#lesson-launcher)
- [Session Workspace](#session-workspace)
- [Lesson Release Console](#lesson-release-console)
- [Cohort Progress Dashboard](#cohort-progress-dashboard)
- [Mentor Review Center](#mentor-review-center)
- [Skill Assessment Center](#skill-assessment-center)
- [Post-Lesson Pack](#post-lesson-pack)
- [Submission Inbox](#submission-inbox)
- [Mentor Live Cockpit](#mentor-live-cockpit)
- [Lesson Delivery Control Room](#lesson-delivery-control-room)
- [Lesson Run Evidence Ledger](#lesson-run-evidence-ledger)
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

## Global Navigation и Command Center

`Global Navigation` — постоянный верхний слой портала. Он показывает текущий контекст ученика и урока, статус `catalog` / `session`, быстрые переходы между основными поверхностями и не дает открыть экраны, которым нужна валидная session.

Доступные поверхности:

- `Academy Lesson Hub`
- `Mentor Mission Control`
- `Lesson Release Console`
- `Session Workspace`
- `Mentor Live Cockpit`
- `Mentor Review Center`
- `Skill Assessment Center`
- `Submission Inbox`
- `Cohort Progress Dashboard`
- `Post-Lesson Pack`

`Command Center` открывается кнопкой в верхней панели или горячей клавишей `Cmd/Ctrl + K`. Внутри собраны переходы по порталу и copyable-команды из `control_plane.portal_actions`: запуск, открытие, export портала и release verification command для текущего урока.

Во время live-сессии `Command Center` также показывает stage-aware команды: команду текущего этапа, вопрос ученику из `control_plane.mentor_mode.stage_guides` и `Скопировать ledger report`. Ledger report строится из текущей session, отметок evidence, stage notes, stage statuses, actual time и blockers.

Если session невалидна или не загружена, `Mentor Live Cockpit` остается доступным как экран диагностики, а `Mentor Mission Control`, `Review Center`, `Skill Assessment Center`, `Submission Inbox`, `Cohort Dashboard` и `Post-Lesson Pack` блокируются до появления валидной session. Это защищает ментора от пустых review/submission-экранов во время подготовки урока.

## Mentor Mission Control

`Mentor Mission Control` — операционный пульт ментора. Он не заменяет детальные экраны, а отвечает на один вопрос: что делать прямо сейчас, чтобы урок двигался дальше без ручного обхода всех surfaces.

Экран собирает сигналы из уже существующих модулей:

- `Mentor Live Cockpit`: отмеченные evidence items и stage notes;
- `Lesson Run Evidence Ledger`: stage statuses, planned/actual time и blockers;
- `Submission Inbox`: homework completeness и latest submission;
- `Skill Assessment Center`: mastery, focus skills и blockers;
- `Post-Lesson Pack`: readiness и unresolved items.

На одном экране видны:

- `Next Best Action` — главный следующий шаг с переходом в нужную surface;
- `Journey Checklist` — Before / Live / After состояние урока;
- `Signals` — компактные метрики по evidence, ledger, homework, assessment и pack;
- `Focus Queue` — задачи, которые ментору стоит закрыть первыми;
- `Quick Links` — быстрые переходы в cockpit, review, assessment, submissions, cohort и pack.

Mission Control работает browser-local и читает те же session-scoped ключи:

```text
mentor-cockpit:<contract_version>:<lab_name>:<student_name>:<created_at>
evidence-ledger:<contract_version>:<lab_name>:<student_name>:<created_at>
submission-inbox:<contract_version>:<lab_name>:<student_name>:<created_at>
```

Рекомендуемый workflow:

1. Открыть текущую session из `Academy Lesson Hub`.
2. Перейти в `Mentor Mission Control`.
3. Выполнить `Next Best Action`.
4. После каждого крупного шага нажимать `Обновить mission`.
5. В конце урока использовать Mission report как краткую операционную сводку.

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

`Cohort Progress Dashboard` — операционный экран ментора по ученикам и recent runs. Он агрегирует current live session, imported sessions из `Session Workspace`, browser-local evidence из `Mentor Live Cockpit`, `Lesson Run Evidence Ledger` и homework submissions из `Submission Inbox`.

Dashboard показывает:

- количество learners и средний evidence score;
- сколько submissions готовы к review;
- учеников с открытыми risks/gaps;
- learner cards с текущим stage, next lesson, submission status, evidence gaps, ledger risk/skipped stages, missing evidence и time overrun;
- skill heatmap по `skill_graph`;
- copyable Markdown для next actions.

Первый релиз намеренно остается browser-local: портал не отправляет данные на backend и не требует отдельной базы. Источники берутся из существующих ключей:

```text
session-workspace:academy-session/v1
mentor-cockpit:<contract_version>:<lab_name>:<student_name>:<created_at>
evidence-ledger:<contract_version>:<lab_name>:<student_name>:<created_at>
submission-inbox:<contract_version>:<lab_name>:<student_name>:<created_at>
```

Рекомендуемый workflow:

1. Импортировать несколько `session.json` в `Session Workspace` или открыть текущую live-сессию.
2. В cockpit отметить evidence, stage notes и ledger status/actual time/blockers.
3. В `Submission Inbox` принять homework evidence ученика.
4. Открыть `Cohort Progress Dashboard` и отфильтровать learners с risks или ready submissions.
5. Скопировать Markdown summary в рабочий журнал или план следующей встречи.

## Mentor Review Center

`Mentor Review Center` — экран закрытия урока. Он берет выбранную session, читает browser-local заметки и отмеченные evidence items из `Mentor Live Cockpit`, добавляет `Lesson Run Evidence Ledger`, затем собирает понятный handoff:

- evidence score по `skill_graph`;
- stage review с вопросами, проверками, заметками ментора, ledger status, planned/actual time delta и blockers;
- сильные сигналы;
- открытые риски;
- рекомендации ученику;
- следующий урок из `control_plane.next_lesson`;
- copyable Markdown и JSON export.

Данные review не уходят на backend. Портал читает те же browser-local ключи, которые использует cockpit и ledger:

```text
mentor-cockpit:<contract_version>:<lab_name>:<student_name>:<created_at>
evidence-ledger:<contract_version>:<lab_name>:<student_name>:<created_at>
```

Рекомендуемый workflow после занятия:

1. В cockpit отметить evidence, записать короткие stage notes и закрыть ledger statuses.
2. Нажать `Открыть review`.
3. Проверить score, ledger summary, risks и recommendations.
4. Скопировать Markdown-отчет ученику или в рабочий журнал.
5. Скопировать JSON, если нужен машинно-читаемый handoff для будущей автоматизации.

## Skill Assessment Center

`Skill Assessment Center` превращает разрозненные сигналы урока в оценку освоения навыков и learning path. Он не заменяет ревью ментора, а отвечает на практичный вопрос: что ученик уже может делать сам, что он только повторяет по образцу, и какой фокус дать на следующую встречу.

Экран собирает три источника:

- `Mentor Live Cockpit`: отмеченные skills и stage notes;
- `Lesson Run Evidence Ledger`: status stage, фактическое время и blockers;
- `Submission Inbox`: evidence из домашки и self-check.

Для каждого элемента `skill_graph` портал рассчитывает уровень:

- `not-started` — нет подтвержденного evidence;
- `aware` — есть заметка или ledger-сигнал, но навык еще не подтвержден;
- `can-repeat` — ученик повторил действие или принес homework evidence;
- `can-explain` — есть mentor evidence и объяснение/успешный stage;
- `can-apply` — есть mentor evidence, успешный ledger stage и homework evidence.

Данные остаются browser-local и читаются из уже существующих ключей:

```text
mentor-cockpit:<contract_version>:<lab_name>:<student_name>:<created_at>
evidence-ledger:<contract_version>:<lab_name>:<student_name>:<created_at>
submission-inbox:<contract_version>:<lab_name>:<student_name>:<created_at>
```

Рекомендуемый workflow:

1. Вести занятие в `Mentor Live Cockpit` и закрывать ledger statuses.
2. Принять или проверить homework evidence в `Submission Inbox`.
3. Открыть `Skill Assessment Center`.
4. Проверить `mastery`, focus skills, blockers и recommended next actions.
5. Скопировать `Assessment` в рабочий журнал или использовать его как основу для плана следующего урока.

## Post-Lesson Pack

`Post-Lesson Pack` — единый пакет закрытия урока. Он собирает в один экран и один copy-ready Markdown:

- review score, сильные сигналы и рекомендации из `Mentor Review Center`;
- ledger status, blockers и time delta из `Lesson Run Evidence Ledger`;
- homework readiness из `Submission Inbox`;
- next lesson из `control_plane.next_lesson`;
- unresolved blockers и next actions для ментора.

Пакет работает browser-local и читает те же session-scoped ключи:

```text
mentor-cockpit:<contract_version>:<lab_name>:<student_name>:<created_at>
evidence-ledger:<contract_version>:<lab_name>:<student_name>:<created_at>
submission-inbox:<contract_version>:<lab_name>:<student_name>:<created_at>
```

Рекомендуемый workflow:

1. Провести урок в `Mentor Live Cockpit` и закрыть ledger statuses.
2. Проверить homework в `Submission Inbox`.
3. Открыть `Post-Lesson Pack`.
4. Если readiness `needs-attention`, закрыть blockers или явно зафиксировать их в follow-up.
5. Скопировать `Pack` ученику, в рабочий журнал или в следующий lesson handoff.

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

## Lesson Delivery Control Room

`Lesson Delivery Control Room` — фокусный слой внутри `Mentor Live Cockpit`. Он не заменяет подробные панели cockpit, а собирает самое нужное для текущего stage в одном месте:

- stage timer, planned/remaining time и progress текущего этапа;
- `Что сказать`, `Что показать`, `Что спросить`, `Как проверить` из stage guide;
- быстрый `Mark evidence` по первому ключевому skill marker;
- короткая заметка ментора, синхронизированная с заметкой текущего stage;
- `Panic mode` для типовых сбоев: стенд не поднялся, SQL не работает, ученик отстал.

Состояние таймера и panic mode хранится browser-local по ключу:

```text
delivery-control-room:<contract_version>:<lab_name>:<student_name>:<created_at>
```

Заметки и evidence не дублируются: Control Room пишет в тот же локальный state, который использует `Mentor Live Cockpit`, поэтому review/handoff видят эти данные без отдельного экспорта.

## Lesson Run Evidence Ledger

`Lesson Run Evidence Ledger` — операционный журнал урока внутри `Mentor Live Cockpit`. Он превращает live-проведение в проверяемый след: по каждому stage видно planned/actual time, статус, evidence, заметку и blocker.

Ledger нужен для трех сценариев:

- во время урока ментор отмечает `done`, `risk`, `skipped` или `pending` по каждому stage;
- сразу после урока ментор получает copy-ready Markdown handoff без ручного сбора заметок;
- `Mentor Review Center`, `Cohort Progress Dashboard` и `Command Center` опираются на те же browser-local decisions, а не на память ментора.

Ledger не дублирует заметки и evidence: он читает `checkedEvidence` и `notesByStage` из `Mentor Live Cockpit`, а отдельно хранит только status, actual minutes и blockers:

```text
evidence-ledger:<contract_version>:<lab_name>:<student_name>:<created_at>
```

Рекомендуемый workflow:

1. Вести stage через `Lesson Delivery Control Room`.
2. В Ledger отметить статус stage и фактическое время.
3. При риске заполнить короткий blocker.
4. В конце урока скопировать `Lesson ledger markdown` в mentor review или handoff.
5. Открыть `Mentor Review Center` или `Cohort Progress Dashboard`: ledger status, blockers и time delta подтянутся автоматически.

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
- `features/global-navigation` — постоянная навигация, Command Center и route guard для surface-переходов.
- `features/mission-control` — next best action, journey checklist, signals, focus queue и quick links для mentor workflow.
- `features/delivery-control-room` — фокусный режим проведения stage: timer, stage script, quick evidence/note actions и panic mode.
- `features/evidence-ledger` — журнал проведения урока: stage statuses, actual time, blockers, evidence summary и Markdown handoff.
- `features/lesson-hub` — витрина направлений, уроков, role-aware команд и readiness.
- `features/lesson-launcher` — генерация launch-пакета, route/platform preferences и copyable команды запуска.
- `features/session-workspace` — browser-local импорт `session.json`, validation, recent runs и выбор session для cockpit.
- `features/release-console` — pre-flight go/no-go, release checks, risks и copyable release report.
- `features/cohort-dashboard` — browser-local cohort aggregation, learner cards, skill heatmap и mentor ops handoff.
- `features/review-center` — evidence score, stage review, risks, recommendations и copyable handoff report.
- `features/assessment-center` — skill mastery scoring, evidence sources, focus gaps, learning path и copyable assessment report.
- `features/post-lesson-pack` — единый post-lesson packet: review, ledger, homework, blockers, next lesson и copyable Markdown/JSON.
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

GitHub Actions выполняет тот же preflight в `Portal CI`. Workflow закреплен на `actions/checkout@v6`, `actions/setup-node@v6`, `node-version: 24` и `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`, чтобы заранее пройти миграцию JavaScript actions runtime с Node 20 на Node 24.

Quality guard входит в `npm run test`:

- любой модуль Vue/TypeScript/JavaScript должен быть не больше `400` SLOC;
- средний clustering coefficient внутреннего import-графа должен быть не больше `0.180`;
- `app.vue`, `composables/useSessionState.ts` и `composables/useCatalogState.ts` остаются тонкими фасадами, а доменная логика живет в `core/session` и `core/catalog`.

## Граница ответственности

- `de-mentor`: lesson contracts, CLI, Docker labs, SQL examples, autograder, docs.
- `de-mentor-portal`: UI, interaction model, academy catalog visualization, session visualization, frontend release cadence.
