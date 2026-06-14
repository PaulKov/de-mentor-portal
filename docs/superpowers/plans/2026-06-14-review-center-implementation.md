# Mentor Review Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Mentor Review & Handoff Center that turns a selected `academy-session/v1` run into a concise lesson review, evidence score, risks, next-step recommendations and copyable handoff report.

**Architecture:** Keep the feature isolated under `features/review-center`. Pure state helpers derive review summaries from `AcademySession` plus mentor-local evidence/notes, while a Vue composable reads the existing `mentor-cockpit` localStorage key. `AcademyPortal` stays a surface switcher for Hub, Workspace, Session Dashboard and Review Center.

**Tech Stack:** Vue 3, Nuxt 3, TypeScript, Node test runner, Playwright, existing `AcademySession`, existing mentor cockpit storage key, existing shared `CopyButton`.

---

## File Structure

- Create `features/review-center/review-center-state.ts` for pure review state and report generation.
- Create `features/review-center/useReviewCenterState.ts` for browser-local mentor state hydration.
- Create `features/review-center/ReviewCenter.vue` for the review screen.
- Create `assets/css/review-center.css` and register it in `nuxt.config.ts`.
- Modify `features/academy-portal/AcademyPortal.vue` to add the `review` surface and route selected sessions into Review Center.
- Modify `features/session-workspace/SessionWorkspace.vue` to add `Открыть review` for recent runs.
- Modify `features/session-dashboard/SessionDashboard.vue`, `features/mentor-cockpit/MentorCockpit.vue`, and `features/student-launchpad/StudentLaunchpad.vue` to expose review navigation from live surfaces.
- Modify `README.md` to document Review Center and handoff flow.
- Add/extend tests in `tests/review-center-state.test.mjs`, `tests/architecture-contract.test.mjs`, and `tests/e2e/session-dashboard.spec.ts`.

## Tasks

### Task 1: Pure Review State

**Files:**
- Create: `tests/review-center-state.test.mjs`
- Create: `features/review-center/review-center-state.ts`

- [ ] **Step 1: Write failing state tests**

Cover evidence scoring, stage note summaries, risk/recommendation derivation, next lesson extraction, Markdown report and JSON export payload.

- [ ] **Step 2: Run test to verify RED**

Run: `npm run test -- tests/review-center-state.test.mjs`

Expected: FAIL because `features/review-center/review-center-state.ts` does not exist.

- [ ] **Step 3: Implement minimal state helpers**

Implement `buildReviewCenterState`, `createReviewReportMarkdown`, `createReviewExportPayload`, and `normalizeReviewLocalState`.

- [ ] **Step 4: Run state tests to verify GREEN**

Run: `npm run test -- tests/review-center-state.test.mjs`

Expected: PASS.

### Task 2: Review Center UI And Portal Routing

**Files:**
- Modify: `tests/architecture-contract.test.mjs`
- Create: `features/review-center/useReviewCenterState.ts`
- Create: `features/review-center/ReviewCenter.vue`
- Create: `assets/css/review-center.css`
- Modify: `nuxt.config.ts`
- Modify: `features/academy-portal/AcademyPortal.vue`
- Modify: `features/session-workspace/SessionWorkspace.vue`
- Modify: `features/session-dashboard/SessionDashboard.vue`
- Modify: `features/mentor-cockpit/MentorCockpit.vue`
- Modify: `features/student-launchpad/StudentLaunchpad.vue`

- [ ] **Step 1: Write failing architecture tests**

Require Review Center files, CSS registration, README marker and navigation markers.

- [ ] **Step 2: Run architecture test to verify RED**

Run: `npm run test -- tests/architecture-contract.test.mjs`

Expected: FAIL because Review Center files and CSS registration are missing.

- [ ] **Step 3: Implement composable and UI**

Read mentor local state from the existing `mentor-cockpit:<contract>:<lab>:<student>:<created_at>` key and render score, stages, risks, recommendations, Markdown report and JSON export.

- [ ] **Step 4: Wire portal navigation**

Workspace and Session Dashboard can open Review Center. Review Center can return to catalog, workspace or cockpit.

- [ ] **Step 5: Run architecture tests to verify GREEN**

Run: `npm run test -- tests/architecture-contract.test.mjs`

Expected: PASS.

### Task 3: E2E Workflow And Documentation

**Files:**
- Modify: `tests/e2e/session-dashboard.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: Write failing E2E workflow**

Open current session, mark evidence and write a stage note, open Review Center, verify score, risk/recommendation blocks and report content.

- [ ] **Step 2: Run E2E to verify RED**

Run: `npm run test:e2e`

Expected: FAIL until UI routing exists.

- [ ] **Step 3: Update README**

Document Review Center, browser-local mentor state, handoff report and recommended after-lesson flow.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm run build
npm run check
git diff --check
```

Expected: all commands exit 0.

### Task 4: Browser QA And PR

**Files:**
- No source files unless QA finds issues.

- [ ] **Step 1: Start built preview**

Run: `npm run preview:built`.

- [ ] **Step 2: Browser QA**

Open Review Center from cockpit and workspace, verify desktop and mobile layouts, copy/report readability and no overlapping controls.

- [ ] **Step 3: Commit, push and create stacked PR**

Base PR on `codex/session-workspace` so it remains stacked after the Session Workspace PR merges.
