# Session Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a browser-local Session Workspace where a mentor can import session JSON files, validate them, keep recent runs, and open any valid run in the Mentor Live Cockpit.

**Architecture:** Keep the feature isolated under `features/session-workspace`. Pure state helpers own deterministic summaries and storage identity, while the Vue composable owns browser IO: file import, localStorage, validation, selection and removal. `AcademyPortal` remains a thin surface switcher that can render the hub, workspace, or cockpit.

**Tech Stack:** Vue 3, Nuxt 3, TypeScript, Node test runner, Playwright, existing `AcademySessionContractValidator`, existing shared localStorage port.

---

## File Structure

- Create `features/session-workspace/session-workspace-state.ts` for pure functions and types.
- Create `features/session-workspace/useSessionWorkspaceState.ts` for browser storage, file import and validator DI.
- Create `features/session-workspace/SessionWorkspace.vue` for the mentor-facing workspace screen.
- Create `assets/css/session-workspace.css` and register it in `nuxt.config.ts`.
- Modify `features/academy-portal/AcademyPortal.vue` to add the `workspace` surface and pass selected workspace sessions to `SessionDashboard`.
- Modify `features/lesson-hub/LessonHub.vue` to expose an “Открыть сессии” action.
- Modify `README.md` to document browser-local import, privacy and workflow.
- Add/extend tests in `tests/session-workspace-state.test.mjs`, `tests/architecture-contract.test.mjs`, and `tests/e2e/session-dashboard.spec.ts`.

## Tasks

### Task 1: Pure Workspace State

**Files:**
- Create: `tests/session-workspace-state.test.mjs`
- Create: `features/session-workspace/session-workspace-state.ts`

- [ ] **Step 1: Write failing state tests**

Cover deterministic storage key, deterministic entry identity, newest-first sorting, selected entry fallback and compact run summary.

- [ ] **Step 2: Run test to verify RED**

Run: `npm run test -- tests/session-workspace-state.test.mjs`

Expected: FAIL because `features/session-workspace/session-workspace-state.ts` does not exist.

- [ ] **Step 3: Implement minimal state helpers**

Implement `createSessionWorkspaceStorageKey`, `createSessionWorkspaceEntry`, `buildSessionWorkspaceState`, and `summarizeWorkspaceEntry`.

- [ ] **Step 4: Run state tests to verify GREEN**

Run: `npm run test -- tests/session-workspace-state.test.mjs`

Expected: PASS.

### Task 2: Workspace UI And Portal Switch

**Files:**
- Modify: `tests/architecture-contract.test.mjs`
- Create: `features/session-workspace/useSessionWorkspaceState.ts`
- Create: `features/session-workspace/SessionWorkspace.vue`
- Create: `assets/css/session-workspace.css`
- Modify: `nuxt.config.ts`
- Modify: `features/academy-portal/AcademyPortal.vue`
- Modify: `features/lesson-hub/LessonHub.vue`

- [ ] **Step 1: Write failing architecture tests**

Require the new workspace files, CSS registration, README marker and SLOC guard participation.

- [ ] **Step 2: Run architecture test to verify RED**

Run: `npm run test -- tests/architecture-contract.test.mjs`

Expected: FAIL because workspace files and CSS registration are missing.

- [ ] **Step 3: Implement composable and UI**

Use injected validator and shared storage port. File import uses a browser `<input type="file">`, validates JSON client-side, stores only valid sessions locally, and shows validation issues for invalid imports.

- [ ] **Step 4: Wire portal navigation**

Hub opens workspace, workspace opens a selected session in cockpit, cockpit can return to hub. Invalid imported sessions are never opened.

- [ ] **Step 5: Run architecture tests to verify GREEN**

Run: `npm run test -- tests/architecture-contract.test.mjs`

Expected: PASS.

### Task 3: E2E Workflow And Documentation

**Files:**
- Modify: `tests/e2e/session-dashboard.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: Write failing E2E workflow**

Import `public/session.sample.json`, verify the card appears, open it in cockpit and check source attribution.

- [ ] **Step 2: Run E2E to verify RED**

Run: `npm run test:e2e`

Expected: FAIL until UI import workflow exists.

- [ ] **Step 3: Update README**

Document “Session Workspace”, import privacy, localStorage persistence and recommended mentor flow.

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

Open the portal, navigate hub → Session Workspace, import the sample session, open cockpit, check desktop and mobile width, and verify no overlap in the workspace cards.

- [ ] **Step 3: Commit, push and create stacked PR**

Base PR on `codex/lesson-launcher` so it remains stacked after the Lesson Launcher work.
