# Review Automation v2 Implementation Plan

## Goal

Turn the browser-local `Lesson Run Evidence Ledger` into operational review data for `Mentor Review Center`, `Cohort Progress Dashboard`, and `Command Center`.

## Scope

- `Review Center` shows ledger status, planned/actual delta, blockers, and includes a ledger handoff section in Markdown/JSON exports.
- `Cohort Dashboard` highlights learners with ledger `risk`/`skipped` stages, time overruns, and missing evidence.
- `Command Center` exposes `Скопировать ledger report` when a valid session has a browser-local or computed ledger report.
- README explains the new automation path.

## Architecture

- Keep pure derivation inside existing state builders:
  - `features/review-center/review-center-state.ts`
  - `features/cohort-dashboard/cohort-dashboard-state.ts`
  - `features/global-navigation/global-navigation-state.ts`
- Keep browser-local reads in composables/facades:
  - `useReviewCenterState`
  - `useCohortDashboardState`
  - `useGlobalNavigationState`
- Reuse `buildEvidenceLedgerState` and `createEvidenceLedgerStorageKey` instead of duplicating ledger calculations.

## TDD Steps

1. Add failing state tests for review ledger summaries and Markdown.
2. Add failing state tests for cohort ledger risk/time/evidence signals.
3. Add failing state test for Command Center ledger copy command.
4. Add failing e2e expectations for review/cohort/command-center visible ledger signals.
5. Implement minimal state and UI changes.
6. Update README and guardrails.
7. Run targeted tests, full test suite, e2e, build, audit, quality guards, and browser/rendered QA.

## Verification

```bash
npm run test
npm run validate:session -- public/session.sample.json
npm run test:e2e
npm run build
npm audit --audit-level=high
git diff --check
```
