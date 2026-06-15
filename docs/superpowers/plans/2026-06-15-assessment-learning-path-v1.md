# Skill Assessment Center v1

## Цель

Добавить в портал отдельную поверхность `Skill Assessment Center`, которая собирает evidence из live-cockpit, ledger и homework submission, рассчитывает уровень освоения каждого навыка и формирует learning path на следующий урок.

## UX-контракт

- Поверхность доступна из `Global Navigation` только при валидной session.
- Ментор видит общий mastery, количество навыков, навыки в зоне риска и фокус на следующий урок.
- По каждому skill видно уровень: `not-started`, `aware`, `can-repeat`, `can-explain`, `can-apply`.
- Для каждого skill показываются источники evidence: mentor, ledger, homework.
- Экран дает copy-ready Markdown и JSON export.

## Архитектурный контракт

- `features/assessment-center/assessment-center-state.ts` содержит чистую доменную сборку состояния.
- `features/assessment-center/useAssessmentCenterState.ts` является тонким browser-local фасадом.
- `features/assessment-center/AssessmentCenter.vue` отвечает только за композицию UI.
- `assets/css/assessment-center.css` содержит scoped-like BEM-классы без влияния на другие поверхности.
- Каждый модуль остается меньше `400` SLOC.

## План выполнения

1. Добавить RED-тесты для state-builder, global navigation, architecture contract и e2e.
2. Реализовать `assessment-center-state.ts` с deterministic scoring.
3. Реализовать browser-local composable, который читает существующие storage keys.
4. Добавить Vue-surface и подключить ее в `AcademyPortal`.
5. Добавить CSS и подключить его в `nuxt.config.ts`.
6. Обновить README и навигационный copy.
7. Прогнать unit, e2e, build, browser QA, затем commit/push/PR.

## Критерии готовности

- `npm run check` проходит локально.
- `npm run build` проходит локально.
- Playwright-проверка `Skill Assessment Center` проходит.
- Browser QA подтверждает desktop/mobile без горизонтального overflow.
- PR открыт и готов к merge после зеленого CI.
