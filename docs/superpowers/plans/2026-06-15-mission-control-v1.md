# Mission Control v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `Mentor Mission Control`, a new portal surface that gives the mentor one operational overview with next best action, journey checklist, signals, focus queue and quick links.

**Architecture:** Add a feature-oriented module under `features/mission-control` that aggregates existing state builders instead of duplicating their logic. The Vue surface stays thin; all scoring, priorities and Markdown live in a pure state builder; browser localStorage reads live in a composable.

**Tech Stack:** Vue 3, Nuxt 4, Vite, TypeScript, Node test runner, Playwright, existing portal localStorage utilities.

---

## File Structure

- Create `features/mission-control/mission-control-state.ts`: pure Mission Control domain state, priorities, signals, Markdown.
- Create `features/mission-control/useMissionControlState.ts`: thin browser-local facade that reads mentor, ledger and submission storage.
- Create `features/mission-control/MissionControl.vue`: rendered portal surface with actions to existing screens.
- Create `assets/css/mission-control.css`: responsive light-theme styles.
- Create `tests/mission-control-state.test.mjs`: deterministic state and next-action tests.
- Modify `features/global-navigation/global-navigation-state.ts`: add `mission-control` surface.
- Modify `features/academy-portal/AcademyPortal.vue`: render `MissionControl`.
- Modify `nuxt.config.ts`: load Mission Control CSS.
- Modify `tests/architecture-contract.test.mjs`: include new feature files and CSS.
- Modify `tests/global-navigation-state.test.mjs`: assert navigation order and guards.
- Modify `tests/e2e/session-dashboard.spec.ts`: add desktop/mobile flow.
- Modify `README.md`: document Mission Control after Global Navigation.

## Task 1: RED State Builder Tests

**Files:**
- Create: `tests/mission-control-state.test.mjs`

- [ ] **Step 1: Write the failing state tests**

Create tests for:

```js
test('buildMissionControlState creates next best action from ledger and homework signals', async () => {
  const { buildMissionControlState, createMissionControlReportMarkdown } =
    await import('../features/mission-control/mission-control-state.ts')
  const session = await loadSession()
  const submissionState = await createCompleteSubmissionState(session)

  const state = buildMissionControlState(session, {
    catalogIsValid: true,
    sessionIsValid: true,
    checkedEvidence: ['partition-pruning'],
    notesByStage: {
      'partition-pruning': 'Ученик сам объяснил pruning.'
    },
    stageStatuses: {
      replay: 'done',
      'partition-pruning': 'done',
      statistics: 'risk'
    },
    blockersByStage: {
      statistics: 'Нет before/after EXPLAIN.'
    },
    submissionState
  })

  assert.equal(state.title, 'Demo Student · greenplum-partitioning')
  assert.equal(state.phase, 'after')
  assert.equal(state.nextAction.targetSurface, 'review')
  assert.equal(state.signals.find(signal => signal.code === 'assessment')?.value, '75%')
  assert.ok(state.focusQueue.some(action => action.title.includes('Statistics')))
  assert.ok(state.quickLinks.some(link => link.surface === 'post-lesson'))
  assert.match(createMissionControlReportMarkdown(state), /# Mentor Mission Control/)
})
```

Add a second test for empty local state:

```js
test('buildMissionControlState keeps an empty live session actionable', async () => {
  const { buildMissionControlState } =
    await import('../features/mission-control/mission-control-state.ts')
  const state = buildMissionControlState(await loadSession(), {
    catalogIsValid: true,
    sessionIsValid: true
  })

  assert.equal(state.phase, 'live')
  assert.equal(state.nextAction.targetSurface, 'session')
  assert.equal(state.signals.find(signal => signal.code === 'evidence')?.value, '0%')
  assert.ok(state.checklist.some(section => section.code === 'live'))
})
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
node --test tests/mission-control-state.test.mjs
```

Expected: fail with module not found for `features/mission-control/mission-control-state.ts`.

## Task 2: GREEN State Builder

**Files:**
- Create: `features/mission-control/mission-control-state.ts`
- Test: `tests/mission-control-state.test.mjs`

- [ ] **Step 1: Implement Mission Control state**

Implement exported types:

```ts
export type MissionPhase = 'before' | 'live' | 'after'
export type MissionStatus = 'ready' | 'open' | 'blocked'
export type MissionActionPriority = 'critical' | 'high' | 'normal'
```

Implement:

```ts
export const buildMissionControlState = (
  session: AcademySession,
  input: MissionControlInput = {}
): MissionControlState => { ... }

export const createMissionControlReportMarkdown = (
  state: MissionControlState
) => string
```

Rules:

- use `buildEvidenceLedgerState`;
- use `buildReviewCenterState`;
- use `buildSubmissionInboxState`;
- use `buildAssessmentCenterState`;
- use `buildPostLessonPackState`;
- phase is `before` when catalog/session is not ready, `live` while ledger done count is lower than total, `after` otherwise;
- next action priority order follows the design spec;
- focus queue includes blockers, homework gaps, assessment focus skills and post-lesson blockers;
- quick links include `session`, `review`, `assessment`, `submission`, `cohort`, `post-lesson`.

- [ ] **Step 2: Run state tests**

Run:

```bash
node --test tests/mission-control-state.test.mjs
```

Expected: pass.

## Task 3: RED Navigation, Architecture And E2E Tests

**Files:**
- Modify: `tests/global-navigation-state.test.mjs`
- Modify: `tests/architecture-contract.test.mjs`
- Modify: `tests/e2e/session-dashboard.spec.ts`

- [ ] **Step 1: Add navigation expectations**

Update expected surface order:

```js
[
  'hub',
  'mission-control',
  'release',
  'workspace',
  'session',
  'review',
  'assessment',
  'submission',
  'cohort',
  'post-lesson'
]
```

Assert command:

```js
command.id === 'open-mission-control' &&
command.label === 'Открыть Mentor Mission Control'
```

- [ ] **Step 2: Add architecture expectations**

Add expected files and CSS:

```js
'assets/css/mission-control.css'
'features/mission-control/MissionControl.vue'
'features/mission-control/useMissionControlState.ts'
'features/mission-control/mission-control-state.ts'
```

Assert Nuxt config loads `~/assets/css/mission-control.css` and AcademyPortal renders `<MissionControl`.

- [ ] **Step 3: Add E2E Mission Control flow**

Add a Playwright test:

```js
test('opens mentor mission control with next action and journey signals', async ({ page }) => {
  await openCurrentSession(page)
  await page.getByRole('button', { name: 'Mentor Mission Control' }).click()

  await expect(page.getByRole('heading', { name: 'Mentor Mission Control' })).toBeVisible()
  await expect(page.getByLabel('Mission signals')).toBeVisible()
  await expect(page.getByLabel('Mission journey checklist')).toBeVisible()
  await expect(page.getByLabel('Mission focus queue')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Открыть cockpit' })).toBeVisible()
})
```

- [ ] **Step 4: Run tests to verify RED**

Run:

```bash
node --test tests/global-navigation-state.test.mjs tests/architecture-contract.test.mjs
npx playwright test tests/e2e/session-dashboard.spec.ts -g "mission control"
```

Expected: fail because surface and component do not exist.

## Task 4: Composable, Surface And Styles

**Files:**
- Create: `features/mission-control/useMissionControlState.ts`
- Create: `features/mission-control/MissionControl.vue`
- Create: `assets/css/mission-control.css`
- Modify: `nuxt.config.ts`

- [ ] **Step 1: Implement composable**

Read storage keys with existing helpers:

```ts
createMentorStorageKey(session.value)
createEvidenceLedgerStorageKey(session.value)
createSubmissionStorageKey(session.value)
```

Return:

```ts
missionState
reportMarkdown
hydrate
```

- [ ] **Step 2: Implement Vue surface**

Render:

- topbar with `Mentor Mission Control`;
- next action panel;
- mission signals;
- before/live/after checklist;
- focus queue;
- quick links;
- Markdown textarea.

Emit navigation events:

```ts
'open-hub'
'open-release'
'open-workspace'
'open-session'
'open-review'
'open-assessment'
'open-submission'
'open-cohort'
'open-post-lesson'
```

- [ ] **Step 3: Implement CSS**

Use BEM-ish `mission-*` classes, grid with responsive constraints, card radius `8px`, no decorative gradients/orbs, no horizontal overflow.

- [ ] **Step 4: Register CSS**

Add `~/assets/css/mission-control.css` to `nuxt.config.ts`.

## Task 5: Wire Portal Surface

**Files:**
- Modify: `features/global-navigation/global-navigation-state.ts`
- Modify: `features/academy-portal/AcademyPortal.vue`

- [ ] **Step 1: Add `mission-control` surface**

Add to `PortalSurface`, `PORTAL_SURFACES`, `SESSION_REQUIRED_SURFACES`, and `SURFACE_COPY`.

- [ ] **Step 2: Render component in AcademyPortal**

Import `MissionControl` and add a `v-else-if` branch when `surface === 'mission-control'`.

Pass navigation props and event handlers for all quick links.

## Task 6: Documentation And Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document Mission Control**

Add section after Global Navigation:

- what Mission Control does;
- what storage keys it reads;
- recommended workflow;
- where it sits in architecture.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run check
npm run build
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 3: Browser QA**

Run built preview and verify:

```bash
npm run preview:built -- 3488
```

Flow under test:

```text
app loads -> open current session -> open Mentor Mission Control -> inspect desktop/mobile layout
```

Check:

- page title and heading;
- not blank;
- no framework overlay;
- console errors empty;
- desktop overflow `0`;
- mobile overflow `0`;
- at least one quick-link interaction works.

## Task 7: Commit, PR, Merge And Release

- [ ] **Step 1: Commit implementation**

```bash
git add README.md assets/css/mission-control.css features/mission-control \
  features/academy-portal/AcademyPortal.vue \
  features/global-navigation/global-navigation-state.ts \
  nuxt.config.ts tests
git commit -m "feat: add mentor mission control"
```

- [ ] **Step 2: Push and PR**

```bash
git push -u origin codex/mission-control-v1
gh pr create --base master --head codex/mission-control-v1 \
  --title "feat: add mentor mission control" \
  --body "<summary and verification>"
```

- [ ] **Step 3: Merge after CI**

Watch checks, merge after green CI, then release as `v0.8.0` if this user-facing surface lands cleanly.
