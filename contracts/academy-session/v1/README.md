# Academy Session v1

`academy-session/v1` — стабильный JSON-контракт между core CLI `de-mentor` и frontend-сервисом `de-mentor-portal`.

Core генерирует `session.json`, портал только читает его через `MENTOR_LAB_SESSION`.

Минимальные требования:

- `contract_version = academy-session/v1`;
- `current_stage` соответствует одному из `stages`;
- `portal.repository = https://github.com/PaulKov/de-mentor-portal`;
- команды остаются обычными строками и могут копироваться из UI;
- `skill_graph` описывает наблюдаемые навыки и evidence.

Optional `homework_review` включает `Homework Review Studio` в `Mentor Live Cockpit`.
Core CLI создает этот блок командой:

```bash
python3 mentor-lab.py session greenplum start --homework-review lesson-01 --student Иван --output artifacts/sessions/ivan-review
```

Если `--submission` не передан, payload работает как guided walkthrough с `submission_status = not_submitted`. Если submission есть, core использует `HomeworkReviewer` и заполняет score, rubric, missing evidence, next actions, SQL snippets, mentor conclusion и план Lesson 02.
