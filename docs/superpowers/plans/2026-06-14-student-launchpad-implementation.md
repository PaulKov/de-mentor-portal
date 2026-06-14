# Student Launchpad Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a session-driven Student Launchpad mode to the Nuxt portal so students can prepare environment, open materials, run self-check commands and understand homework handoff on macOS, Windows/WSL2 and Linux.

**Architecture:** `features/session-dashboard` owns only mode selection and delegates to either `MentorCockpit` or `StudentLaunchpad`. `features/student-launchpad` owns pure state derivation, platform persistence and focused Vue components. Session contract stays unchanged and reads from existing `control_plane.student_mode`, `portal_actions`, `artifacts` and `next_lesson`.

**Tech Stack:** Vue 3, Nuxt 3, TypeScript, Node test runner, Playwright, existing `createSafeLocalStoragePort` DI adapter.

---

### Task 1: Dashboard Mode Contract

**Files:**
- Create: `features/session-dashboard/session-dashboard-mode.ts`
- Create: `features/session-dashboard/useSessionDashboardMode.ts`
- Test: `tests/session-dashboard-mode.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
test('createDashboardModeStorageKey isolates mode by session identity', async () => {
  const { createDashboardModeStorageKey } = await import('../features/session-dashboard/session-dashboard-mode.ts')
  const session = await loadSample()

  assert.equal(
    createDashboardModeStorageKey(session),
    'session-dashboard-mode:academy-session/v1:greenplum-partitioning:Demo Student:2026-06-14T10:00:00'
  )
})

test('normalizeDashboardMode accepts only known modes', async () => {
  const { normalizeDashboardMode } = await import('../features/session-dashboard/session-dashboard-mode.ts')

  assert.equal(normalizeDashboardMode('student'), 'student')
  assert.equal(normalizeDashboardMode('mentor'), 'mentor')
  assert.equal(normalizeDashboardMode('broken'), 'mentor')
  assert.equal(normalizeDashboardMode(undefined), 'mentor')
})
```

- [ ] **Step 2: Verify RED**

Run: `npm run test`
Expected: FAIL because `features/session-dashboard/session-dashboard-mode.ts` does not exist.

- [ ] **Step 3: Implement minimal pure contract**

```ts
export type DashboardMode = 'mentor' | 'student'

export const createDashboardModeStorageKey = (session: AcademySession) =>
  ['session-dashboard-mode', session.contract_version, session.lab_name, session.student_name, session.created_at].join(':')

export const normalizeDashboardMode = (value: unknown): DashboardMode =>
  value === 'student' || value === 'mentor' ? value : 'mentor'
```

- [ ] **Step 4: Add Vue persistence facade**

`useSessionDashboardMode.ts` should load mode on `mounted`, persist mode after storage is loaded, and expose `{ mode, selectMode }`.

- [ ] **Step 5: Verify GREEN**

Run: `npm run test`
Expected: PASS for new unit tests and existing tests.

### Task 2: Student Launchpad State

**Files:**
- Create: `features/student-launchpad/student-launchpad-state.ts`
- Create: `features/student-launchpad/useStudentLaunchpadState.ts`
- Test: `tests/student-launchpad-state.test.mjs`

- [ ] **Step 1: Write failing tests**

```js
test('buildStudentLaunchpadState exposes lesson resources and commands', async () => {
  const { buildStudentLaunchpadState } = await import('../features/student-launchpad/student-launchpad-state.ts')
  const state = buildStudentLaunchpadState(await loadSample(), 'macos')

  assert.equal(state.selectedPlatform.code, 'macos')
  assert.ok(state.resources.some(resource => resource.label === 'Student prep'))
  assert.ok(state.resources.some(resource => resource.path.endsWith('student-workbook.md')))
  assert.ok(state.resources.some(resource => resource.path.endsWith('homework.md')))
  assert.ok(state.selfCheckCommands.includes('python3 mentor-lab.py doctor'))
  assert.ok(state.portalCommands.some(command => command.includes('mentor-lab.py portal greenplum start')))
})

test('buildStudentLaunchpadState provides Windows WSL2 readiness steps', async () => {
  const { buildStudentLaunchpadState } = await import('../features/student-launchpad/student-launchpad-state.ts')
  const state = buildStudentLaunchpadState(await loadSample(), 'windows')

  assert.equal(state.selectedPlatform.label, 'Windows + WSL2')
  assert.ok(state.readinessSteps.some(step => step.command.includes('wsl --status')))
  assert.ok(state.readinessSteps.some(step => step.command.includes('docker compose version')))
})
```

- [ ] **Step 2: Verify RED**

Run: `npm run test`
Expected: FAIL because `student-launchpad-state.ts` does not exist.

- [ ] **Step 3: Implement pure builder**

`buildStudentLaunchpadState(session, platform)` should return normalized platform, platform-specific readiness steps, resource links, artifact links, self-check commands, portal commands and next lesson data.

- [ ] **Step 4: Add platform persistence facade**

`useStudentLaunchpadState.ts` should persist selected platform through `student-launchpad:<identity>` and expose `{ launchpadState, selectedPlatformCode, selectPlatform }`.

- [ ] **Step 5: Verify GREEN**

Run: `npm run test`
Expected: PASS.

### Task 3: Student UI Components

**Files:**
- Create: `features/student-launchpad/StudentLaunchpad.vue`
- Create: `features/student-launchpad/PlatformReadinessPanel.vue`
- Create: `features/student-launchpad/StudentResourceRail.vue`
- Create: `features/student-launchpad/StudentCommandChecklist.vue`
- Create: `features/session-dashboard/DashboardModeSwitch.vue`
- Modify: `features/session-dashboard/SessionDashboard.vue`
- Modify: `features/mentor-cockpit/MentorCockpit.vue`
- Modify: `assets/css/student-launchpad.css`
- Modify: `nuxt.config.ts`

- [ ] **Step 1: Write failing architecture and e2e assertions**

Add expected files to `tests/architecture-contract.test.mjs`, expect Nuxt to load `student-launchpad.css`, and add Playwright assertions for:

```ts
await page.getByRole('button', { name: 'Ученик' }).click()
await expect(page.getByRole('heading', { name: 'Student Launchpad' })).toBeVisible()
await expect(page.getByText('docs/lessons/02-greenplum-partitioning/student-workbook.md')).toBeVisible()
await expect(page.getByText('python3 mentor-lab.py doctor')).toBeVisible()
await page.getByRole('button', { name: 'Windows + WSL2' }).click()
await expect(page.getByText('wsl --status')).toBeVisible()
```

- [ ] **Step 2: Verify RED**

Run: `npm run test && npm run test:e2e`
Expected: FAIL because UI files and mode switch are not implemented.

- [ ] **Step 3: Implement components**

Keep each Vue component focused:

- `DashboardModeSwitch.vue`: accessible segmented control, emits `select-mode`.
- `StudentLaunchpad.vue`: `AppShell` composition, topbar, readiness, resources, commands, handoff.
- `PlatformReadinessPanel.vue`: platform tabs and readiness checklist.
- `StudentResourceRail.vue`: materials, artifacts and next lesson.
- `StudentCommandChecklist.vue`: copy-ready self-check and portal commands.

- [ ] **Step 4: Wire routing**

`SessionDashboard.vue` should delegate valid sessions by mode:

```vue
<MentorCockpit v-if="mode === 'mentor'" ... />
<StudentLaunchpad v-else ... />
```

`MentorCockpit.vue` receives `activeMode` and emits `select-mode`, preserving existing mentor behavior.

- [ ] **Step 5: Verify GREEN**

Run: `npm run test && npm run test:e2e`
Expected: PASS.

### Task 4: Documentation, Build and PR Readiness

**Files:**
- Modify: `README.md`
- Verify: all changed source files

- [ ] **Step 1: Update README**

Document Student Launchpad, mode persistence, platform preparation and the command sequence:

```bash
npm run dev:sample
MENTOR_LAB_SESSION=/absolute/path/to/session.json npm run dev
npm run validate:session -- public/session.sample.json
```

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run test
npm run validate:session -- public/session.sample.json
npm run build
npm run test:e2e
npm run check
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 3: Browser QA**

Open local dev server, validate the flow:

`app loads -> mentor mode renders -> switch to student mode -> select Windows + WSL2 -> reload -> student mode and Windows platform remain selected`.

- [ ] **Step 4: Commit, push, PR and merge**

```bash
git add .
git commit -m "feat: add student launchpad mode"
git push -u origin codex/student-launchpad
gh pr create --base master --head codex/student-launchpad --title "feat: add student launchpad mode" --body-file <generated-body>
```

Merge after CI is green.
