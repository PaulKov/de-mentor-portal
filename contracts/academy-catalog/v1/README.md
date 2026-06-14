# academy-catalog/v1

`academy-catalog/v1` описывает учебный каталог портала: направления, уроки, readiness, материалы и команды для ролей `mentor` / `student`.

## Lesson Launcher

Готовый урок может дополнительно содержать блок `launcher`. Он нужен порталу, чтобы собрать launch-пакет без запуска локального CLI из браузера.

Минимальная структура:

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
        "code": "macos",
        "title": "macOS",
        "checks": ["docker --version", "docker compose version"],
        "notes": ["Run commands in Terminal from the cloned repository."]
      }
    ]
  }
}
```

`launcher.routes[].session_route` подставляется в команду создания session, а `mentor_command`, `student_command` и `check_command` показываются как copyable launch packet.

Runtime order:

```text
ACADEMY_CATALOG
public/catalog.json
public/catalog.sample.json
```

Контракт не заменяет `academy-session/v1`: каталог отвечает за навигацию академии, а session state отвечает за живое занятие.
