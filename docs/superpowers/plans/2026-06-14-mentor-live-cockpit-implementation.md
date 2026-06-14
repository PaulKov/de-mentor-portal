# Mentor Live Cockpit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved Mentor Live Cockpit MVP in the Nuxt portal so a mentor can run a lesson from one screen with stage guidance, slides/commands, evidence tracking, and release readiness.

**Architecture:** Keep `app.vue` as a thin facade and add a feature-oriented `features/mentor-cockpit` module. The cockpit derives read-only lesson guidance from `academy-session/v1` plus optional `control_plane`, while mentor notes and evidence checks are saved through a small localStorage port keyed by session identity.

**Tech Stack:** Vue 3, Nuxt 3, TypeScript, Node test runner, Playwright, browser `localStorage`.

---

## File Structure

- Create `core/session/domain/control-plane.ts`: optional control plane types used by the cockpit.
- Modify `core/session/domain/academy-session.ts`: add optional `control_plane?: AcademyControlPlane`.
- Modify `core/session/application/session-contract.ts`: tolerate optional `control_plane` and validate key nested arrays when present.
- Create `shared/utils/local-storage.ts`: dependency-injected browser storage port with safe fallback.
- Create `features/mentor-cockpit/mentor-cockpit-state.ts`: pure derived-state functions and session storage key helpers.
- Create `features/mentor-cockpit/useMentorCockpitState.ts`: Vue facade for selected stage, checked evidence, and notes.
- Create `features/mentor-cockpit/MentorCockpit.vue`: top-level cockpit composition.
- Create `features/mentor-cockpit/StagePlayer.vue`: stage script, question, expected answer, verification, navigation.
- Create `features/mentor-cockpit/SlideCommandRail.vue`: Google Slides, slide anchors, stage commands, copy buttons.
- Create `features/mentor-cockpit/EvidencePanel.vue`: evidence checklist, notes, intervention flags.
- Create `features/mentor-cockpit/ReleaseStatusStrip.vue`: compact status row for session/control plane/slides/commands.
- Modify `features/session-dashboard/SessionDashboard.vue`: delegate valid sessions to `MentorCockpit`.
- Modify `assets/css/main.css`: cockpit layout and responsive styling.
- Modify `public/session.sample.json`: add a small `control_plane` sample.
- Modify `README.md`: document cockpit workflow.
- Test `tests/mentor-cockpit-state.test.mjs`: pure state and localStorage key behavior.
- Test `tests/architecture-contract.test.mjs`: new feature taxonomy and module size checks.
- Test `tests/session-contract.test.mjs`: optional control plane validation.
- Test `tests/e2e/session-dashboard.spec.ts`: desktop/mobile cockpit visibility and localStorage persistence.

## Task 1: Control Plane Types And Contract

**Files:**
- Create: `core/session/domain/control-plane.ts`
- Modify: `core/session/domain/academy-session.ts`
- Modify: `core/session/application/session-contract.ts`
- Test: `tests/session-contract.test.mjs`

- [ ] **Step 1: Write the failing test**

Add assertions that `public/session.sample.json` exposes `control_plane.mentor_mode.stage_guides` and that a broken stage guide is rejected by `scripts/validate-session-contract.mjs`.

```js
assert.ok(Array.isArray(runtimeSample.control_plane.mentor_mode.stage_guides))
assert.ok(runtimeSample.control_plane.mentor_mode.stage_guides[0].mentor_script)
await assert.rejects(
  execFileAsync('node', ['scripts/validate-session-contract.mjs', brokenControlPlanePath]),
  error => {
    assert.match(error.stderr, /control_plane.mentor_mode.stage_guides/)
    return true
  }
)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/session-contract.test.mjs`

Expected: FAIL because the runtime sample has no `control_plane` and the validation CLI does not validate control plane fields.

- [ ] **Step 3: Write minimal implementation**

Create `control-plane.ts` with:

```ts
export interface StageGuide {
  stage_code: string
  slides: string
  mentor_script: string
  show_commands: string[]
  question: string
  expected_answer: string
  verification: string
  workbook_ref: string
  homework_ref: string
}

export interface AcademyControlPlane {
  version: string
  mentor_mode: {
    default_route: string
    runbook_commands: string[]
    slide_deck: string
    google_slides: string | null
    stage_guides: StageGuide[]
  }
  artifacts?: Array<{ type: string; title: string; path: string }>
}
```

Import it into `academy-session.ts` and add `control_plane?: AcademyControlPlane`.

Extend the validation CLI and app validator to check optional `control_plane.mentor_mode.stage_guides` when present.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/session-contract.test.mjs`

Expected: PASS.

## Task 2: Pure Cockpit State

**Files:**
- Create: `features/mentor-cockpit/mentor-cockpit-state.ts`
- Create: `shared/utils/local-storage.ts`
- Test: `tests/mentor-cockpit-state.test.mjs`

- [ ] **Step 1: Write the failing test**

Test fallback and control-plane enriched state:

```js
assert.equal(state.current.stage.code, 'environment')
assert.equal(state.current.guide?.question, 'Почему partition key не равен distribution key?')
assert.equal(createMentorStorageKey(session), 'mentor-cockpit:academy-session/v1:greenplum:Demo Student:2026-06-14T10:00:00')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/mentor-cockpit-state.test.mjs`

Expected: FAIL because `mentor-cockpit-state.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement exported functions:

```ts
export const createMentorStorageKey = (session: AcademySession) =>
  ['mentor-cockpit', session.contract_version, session.lab_name, session.student_name, session.created_at].join(':')

export const buildMentorCockpitState = (session: AcademySession, selectedStageCode?: string) => {
  const stage = session.stages.find(item => item.code === selectedStageCode) ?? session.current_stage
  const guide = session.control_plane?.mentor_mode.stage_guides.find(item => item.stage_code === stage.code)
  return { stages: session.stages, current: { stage, guide }, commands: guide?.show_commands ?? [stage.command, ...session.commands] }
}
```

Implement `createSafeLocalStoragePort(storage?: Storage)` that returns `get`, `set`, and `remove` methods and no-ops safely when storage is unavailable.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/mentor-cockpit-state.test.mjs`

Expected: PASS.

## Task 3: Cockpit Components

**Files:**
- Create: `features/mentor-cockpit/MentorCockpit.vue`
- Create: `features/mentor-cockpit/StagePlayer.vue`
- Create: `features/mentor-cockpit/SlideCommandRail.vue`
- Create: `features/mentor-cockpit/EvidencePanel.vue`
- Create: `features/mentor-cockpit/ReleaseStatusStrip.vue`
- Create: `features/mentor-cockpit/useMentorCockpitState.ts`
- Modify: `features/session-dashboard/SessionDashboard.vue`
- Test: `tests/architecture-contract.test.mjs`

- [ ] **Step 1: Write the failing architecture test**

Add expected files and assert `SessionDashboard.vue` delegates to `<MentorCockpit`.

```js
assertFileExists('features/mentor-cockpit/MentorCockpit.vue')
assert.ok((await readText('features/session-dashboard/SessionDashboard.vue')).includes('<MentorCockpit'))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/architecture-contract.test.mjs`

Expected: FAIL because cockpit files are missing.

- [ ] **Step 3: Write minimal implementation**

Create components with explicit props and no business logic beyond presentation. `MentorCockpit.vue` composes:

```vue
<ReleaseStatusStrip :session="session" :source="source" />
<StagePlayer :state="cockpitState" @select-stage="selectStage" />
<SlideCommandRail :state="cockpitState" />
<EvidencePanel :session="session" :state="cockpitState" />
```

Update `SessionDashboard.vue` to render `MentorCockpit` for valid sessions and keep the existing invalid-state path through `SessionStatusBanner`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/architecture-contract.test.mjs`

Expected: PASS.

## Task 4: Styling And Responsive UX

**Files:**
- Modify: `assets/css/main.css`
- Test: `tests/e2e/session-dashboard.spec.ts`

- [ ] **Step 1: Write the failing Playwright test**

Assert key regions:

```ts
await expect(page.getByRole('heading', { name: 'Mentor Live Cockpit' })).toBeVisible()
await expect(page.getByLabel('Stage player')).toBeVisible()
await expect(page.getByLabel('Slides and commands')).toBeVisible()
await expect(page.getByLabel('Evidence panel')).toBeVisible()
await expect(page.getByText('control plane')).toBeVisible()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e`

Expected: FAIL because new UI landmarks are not present yet.

- [ ] **Step 3: Write minimal styling**

Add CSS classes:

```css
.cockpit-layout { display: grid; grid-template-columns: 240px minmax(0, 1fr) 320px; gap: 18px; }
.cockpit-main { display: grid; gap: 18px; }
.stage-player, .slide-command-rail, .evidence-cockpit-panel { min-width: 0; }
@media (max-width: 1100px) { .cockpit-layout { grid-template-columns: 1fr; } }
```

Keep radius at `8px`, no nested UI cards, no gradient/orb decoration.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:e2e`

Expected: PASS on desktop and mobile projects.

## Task 5: Local Evidence Persistence

**Files:**
- Modify: `features/mentor-cockpit/useMentorCockpitState.ts`
- Modify: `features/mentor-cockpit/EvidencePanel.vue`
- Test: `tests/e2e/session-dashboard.spec.ts`

- [ ] **Step 1: Write the failing Playwright test**

Check localStorage persistence:

```ts
await page.getByRole('checkbox', { name: /QD\/QE/ }).check()
await page.reload()
await expect(page.getByRole('checkbox', { name: /QD\/QE/ })).toBeChecked()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e`

Expected: FAIL because checkboxes do not exist or do not persist.

- [ ] **Step 3: Write minimal implementation**

Store mentor state:

```ts
interface MentorLocalState {
  checkedEvidence: string[]
  notesByStage: Record<string, string>
  flagsByStage: Record<string, string[]>
}
```

Use `createMentorStorageKey(session)` and `createSafeLocalStoragePort(window.localStorage)` in the composable.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:e2e`

Expected: PASS.

## Task 6: Docs And Final Verification

**Files:**
- Modify: `README.md`
- Test: `tests/architecture-contract.test.mjs`

- [ ] **Step 1: Write the failing docs test**

Assert README includes:

```js
assert.ok(readme.includes('Mentor Live Cockpit'))
assert.ok(readme.includes('MENTOR_LAB_SESSION=/absolute/path/to/session.json npm run dev'))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/architecture-contract.test.mjs`

Expected: FAIL until README is updated.

- [ ] **Step 3: Update docs**

Add a short Russian section showing how to run the cockpit and how it uses `session.json`.

- [ ] **Step 4: Full verification**

Run:

```bash
npm run test
npm run validate:session -- public/session.sample.json
npm run build
npm run test:e2e
npm run check
git diff --check
```

Expected: all commands exit 0.

## Self-Review Notes

- Spec coverage: all approved MVP blocks map to Tasks 1-5; docs and verification map to Task 6.
- Scope control: no browser SQL execution, no backend persistence, no realtime.
- Type consistency: `AcademyControlPlane`, `StageGuide`, `MentorLocalState`, and `createMentorStorageKey` are named consistently across tasks.
