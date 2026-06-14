# academy-catalog/v1

`academy-catalog/v1` описывает учебный каталог портала: направления, уроки, readiness, материалы и команды для ролей `mentor` / `student`.

Runtime order:

```text
ACADEMY_CATALOG
public/catalog.json
public/catalog.sample.json
```

Контракт не заменяет `academy-session/v1`: каталог отвечает за навигацию академии, а session state отвечает за живое занятие.
