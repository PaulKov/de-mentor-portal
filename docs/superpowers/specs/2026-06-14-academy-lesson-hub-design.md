# Academy Lesson Hub Design

## Цель

Добавить в портал главный экран академии: **Academy Lesson Hub**. Пользователь должен открыть портал без конкретной session state и увидеть направления, уроки, статус готовности материалов и быстрые действия для ментора или ученика.

## Пользовательский сценарий

1. Пользователь открывает портал.
2. Если `academy-catalog/v1` доступен, первым экраном становится Lesson Hub.
3. В Hub видны направления `Greenplum`, `ClickHouse`, `Hadoop`, `Spark`, `Postgres`.
4. Пользователь выбирает направление и роль `Ментор` / `Ученик`.
5. Портал показывает уроки выбранного направления, их release/readiness status, материалы и copy-ready команды.
6. Из Hub можно перейти в текущую session-driven поверхность через кнопку `Открыть текущую сессию`.

## Контракт каталога

Добавляем отдельный контракт `academy-catalog/v1`, независимый от `academy-session/v1`.

Минимальные поля:

- `contract_version`;
- `generated_at`;
- `default_track`;
- `tracks[]`: `code`, `title`, `description`, `status`, `lessons[]`;
- `lessons[]`: `code`, `title`, `summary`, `level`, `duration`, `status`, `readiness[]`, `materials[]`, `mentor_commands[]`, `student_commands[]`, `next_lesson_code`.

Источник данных в этом инкременте:

1. `ACADEMY_CATALOG=/absolute/path/to/catalog.json`;
2. `public/catalog.json`;
3. `public/catalog.sample.json`.

Генерация из core CLI будет отдельным следующим инкрементом; контракт уже должен быть удобен для такой генерации.

## Архитектура

- `core/catalog/domain` — типы и константа контракта.
- `core/catalog/application` — validator и loader с dependency inversion.
- `core/catalog/infrastructure` — HTTP source для `/api/catalog`.
- `server/api/catalog.get.ts` — endpoint чтения env/public/sample JSON.
- `features/lesson-hub` — pure state builder, Vue facade и UI-компоненты.
- `features/session-dashboard` остается session surface и не разрастается.
- `app.vue` остается тонким facade: загружает catalog + session и делегирует в `AcademyPortal`.

## UI-модель

Первый экран — рабочий каталог, не маркетинговый landing page:

- слева компактный список направлений;
- сверху статус каталога и ссылка на текущую сессию;
- в центре список уроков выбранного направления;
- справа action rail с материалами, readiness и командами для выбранной роли;
- role switch `Ментор` / `Ученик` влияет на список команд и primary action.

Стили продолжают существующую светлую тему: белый/почти белый фон, тонкие borders, зеленый accent, 8px radius, плотные readable панели.

## Состояние

Выбранное направление, выбранный урок и роль сохраняются в `localStorage`:

```text
academy-lesson-hub:<contract_version>:<generated_at>
```

Если сохраненный track/lesson отсутствует в новом каталоге, state builder выбирает `default_track` и первый урок направления.

## Проверки

- unit tests для contract validator;
- unit tests для `lesson-hub-state.ts`;
- architecture contract на новые слои и SLOC guard;
- e2e: Hub открывается первым, можно выбрать `Spark`, выбрать роль `Ученик`, увидеть student commands, перейти к session view;
- `npm run build`;
- `npm run check`;
- browser QA desktop/mobile с проверкой console health.

## Не делаем в этом инкременте

- Не делаем backend database.
- Не добавляем auth и пользователей.
- Не исполняем команды из браузера.
- Не переносим `academy-session/v1` в catalog; session остается отдельным runtime state.
