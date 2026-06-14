# Lesson Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-service Lesson Launcher inside `Academy Lesson Hub` so a mentor can select a lesson, choose route/platform, enter a student, and copy the exact commands needed to prepare a live session.

**Architecture:** Extend `academy-catalog/v1` with an optional `launcher` block on ready lessons. Keep command generation in pure feature state under `features/lesson-launcher`, expose it through a thin Vue composable, and render a focused panel inside the existing lesson hub action rail. The browser does not execute CLI commands; it produces a launch packet with copyable commands and platform checks.

**Tech Stack:** Vue 3 + Nuxt 3 + Vite, node:test, Playwright, browser `localStorage`, existing shared UI components.

---

## File Map

- Modify `core/catalog/domain/academy-catalog.ts`
  - Add `CatalogLessonLauncher`, `CatalogLaunchRoute`, and `CatalogPlatformProfile`.
- Modify `core/catalog/application/catalog-contract.ts`
  - Validate optional launcher blocks and reject malformed route/platform data.
- Modify `public/catalog.sample.json`
  - Add launcher config for ready Greenplum lessons.
- Modify `contracts/academy-catalog/v1/catalog.sample.json`
  - Add a compact launcher fixture.
- Modify `contracts/academy-catalog/v1/README.md`
  - Document the optional launcher block.
- Create `features/lesson-launcher/lesson-launcher-state.ts`
  - Pure state builder, storage key, route/platform normalization, command interpolation.
- Create `features/lesson-launcher/useLessonLauncherState.ts`
  - Vue/localStorage facade for selected route, platform, student name, and output dir.
- Create `features/lesson-launcher/LessonLauncher.vue`
  - UI panel with controls, platform checks, and copyable launch commands.
- Modify `features/lesson-hub/LessonActionRail.vue`
  - Render `LessonLauncher` above readiness/materials/commands.
- Modify `assets/css/lesson-hub.css`
  - Add launcher panel layout and responsive controls.
- Modify `tests/catalog-contract.test.mjs`
  - Cover valid launcher fixture and malformed launcher rejection.
- Create `tests/lesson-launcher-state.test.mjs`
  - Cover default selection, custom input, unavailable lessons, and storage key scope.
- Modify `tests/architecture-contract.test.mjs`
  - Add files to taxonomy/SLOC guard and README expectations.
- Modify `tests/e2e/session-dashboard.spec.ts`
  - Cover launch packet generation in desktop/mobile.
- Modify `README.md`
  - Explain Lesson Launcher and `ACADEMY_CATALOG` launcher metadata.

## Task 1: Catalog Launcher Contract

**Files:**
- Modify: `core/catalog/domain/academy-catalog.ts`
- Modify: `core/catalog/application/catalog-contract.ts`
- Modify: `public/catalog.sample.json`
- Modify: `contracts/academy-catalog/v1/catalog.sample.json`
- Modify: `contracts/academy-catalog/v1/README.md`
- Test: `tests/catalog-contract.test.mjs`

- [ ] **Step 1: Write failing catalog tests**

Add assertions that the sample contains a launcher and that a malformed launcher is rejected:

```js
assert.ok(greenplumLesson.launcher, 'ready Greenplum lesson should expose launcher metadata')
assert.equal(greenplumLesson.launcher.lab, 'greenplum')
assert.ok(greenplumLesson.launcher.routes.some(route => route.code === 'simple'))
assert.ok(greenplumLesson.launcher.platforms.some(platform => platform.code === 'windows-wsl2'))
```

Add a broken payload with `launcher.routes: []` and assert validation fails with an issue path containing `launcher.routes`.

- [ ] **Step 2: Run red test**

Run:

```bash
npm run test
```

Expected: `tests/catalog-contract.test.mjs` fails because `launcher` is not defined or not validated.

- [ ] **Step 3: Add domain types**

Add these interfaces to `core/catalog/domain/academy-catalog.ts`:

```ts
export interface CatalogLaunchRoute {
  code: string
  title: string
  description: string
  timebox: string
  session_route: string
  mentor_command: string
  student_command: string
  check_command: string
}

export interface CatalogPlatformProfile {
  code: string
  title: string
  checks: string[]
  notes: string[]
}

export interface CatalogLessonLauncher {
  lab: string
  default_route: string
  default_platform: string
  default_output_dir: string
  routes: CatalogLaunchRoute[]
  platforms: CatalogPlatformProfile[]
}
```

Add `launcher?: CatalogLessonLauncher` to `CatalogLesson`.

- [ ] **Step 4: Add validator support**

In `catalog-contract.ts`, validate optional `launcher`:

```ts
if (lesson.launcher !== undefined) {
  validateLauncher(lesson.launcher, `${lessonPath}.launcher`, issues)
}
```

`validateLauncher` must require:

- `lab`, `default_route`, `default_platform`, `default_output_dir` as non-empty strings;
- `routes` as non-empty array;
- every route has non-empty `code`, `title`, `description`, `timebox`, `session_route`, `mentor_command`, `student_command`, `check_command`;
- `platforms` as non-empty array;
- every platform has non-empty `code`, `title`, string array `checks`, string array `notes`.

- [ ] **Step 5: Add sample launcher data**

For `01-greenplum-foundations`, add:

```json
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
    },
    {
      "code": "deep",
      "title": "Deep-dive path",
      "description": "90-120 minute route with QD/QE, storage and explain internals.",
      "timebox": "90-120 min",
      "session_route": "deep",
      "mentor_command": "python3 mentor-lab.py runbook greenplum deep",
      "student_command": "python3 mentor-lab.py runbook greenplum homework",
      "check_command": "python3 mentor-lab.py check greenplum"
    }
  ],
  "platforms": [
    {
      "code": "macos",
      "title": "macOS",
      "checks": ["docker --version", "docker compose version", "python3 --version", "git --version"],
      "notes": ["Run commands in Terminal from the cloned repository."]
    },
    {
      "code": "windows-wsl2",
      "title": "Windows + WSL2",
      "checks": ["wsl --status", "docker --version", "docker compose version", "python3 --version", "git --version"],
      "notes": ["Use a WSL distro shell and enable Docker Desktop WSL integration."]
    },
    {
      "code": "linux",
      "title": "Linux",
      "checks": ["docker --version", "docker compose version", "python3 --version", "git --version"],
      "notes": ["Ensure the current user can run Docker commands."]
    }
  ]
}
```

Add a similar launcher for `02-greenplum-partitioning` with lab `greenplum-partitioning`.

- [ ] **Step 6: Run green test and commit**

Run:

```bash
npm run test
git diff --check
```

Commit:

```bash
git add core/catalog contracts/academy-catalog public/catalog.sample.json tests/catalog-contract.test.mjs
git commit -m "feat: add lesson launcher catalog metadata"
```

## Task 2: Launcher State

**Files:**
- Create: `features/lesson-launcher/lesson-launcher-state.ts`
- Create: `features/lesson-launcher/useLessonLauncherState.ts`
- Test: `tests/lesson-launcher-state.test.mjs`

- [ ] **Step 1: Write failing state tests**

Cover these behaviors:

```js
test('buildLessonLauncherState creates default launch packet for ready lesson', () => {
  const state = buildLessonLauncherState(track, lesson)
  assert.equal(state.isAvailable, true)
  assert.equal(state.selectedRoute.code, 'simple')
  assert.equal(state.selectedPlatform.code, 'macos')
  assert.ok(state.sessionCommand.includes('--student "Demo Student"'))
  assert.ok(state.sessionCommand.includes('--route simple'))
})
```

```js
test('buildLessonLauncherState applies student, route, platform and output preferences', () => {
  const state = buildLessonLauncherState(track, lesson, {
    studentName: 'Мария',
    routeCode: 'deep',
    platformCode: 'windows-wsl2',
    outputDir: 'artifacts/sessions/maria'
  })
  assert.equal(state.selectedRoute.code, 'deep')
  assert.equal(state.selectedPlatform.code, 'windows-wsl2')
  assert.ok(state.sessionCommand.includes('--student "Мария"'))
  assert.ok(state.sessionCommand.includes('--output artifacts/sessions/maria'))
  assert.ok(state.platformChecks.includes('wsl --status'))
})
```

```js
test('buildLessonLauncherState reports unavailable launcher for planned lessons', () => {
  const state = buildLessonLauncherState(track, lessonWithoutLauncher)
  assert.equal(state.isAvailable, false)
  assert.equal(state.commands.length, 0)
})
```

- [ ] **Step 2: Run red test**

Run:

```bash
npm run test
```

Expected: test fails because `features/lesson-launcher/lesson-launcher-state.ts` does not exist.

- [ ] **Step 3: Implement pure state**

Create `lesson-launcher-state.ts` with:

- `LessonLaunchPreferences`
- `LessonLaunchCommand`
- `LessonLauncherState`
- `createLessonLauncherStorageKey(track, lesson, catalogGeneratedAt)`
- `buildLessonLauncherState(track, lesson, preferences = {})`

Command generation:

```ts
const sessionCommand = [
  'python3 mentor-lab.py session',
  launcher.lab,
  'start',
  '--student',
  quoteShell(studentName),
  '--route',
  selectedRoute.session_route,
  '--output',
  outputDir
].join(' ')
```

`commands` order:

1. `Create session`
2. `Mentor runbook`
3. `Student runbook`
4. `Self-check`

- [ ] **Step 4: Implement Vue facade**

Create `useLessonLauncherState.ts` with localStorage persistence for:

- `studentName`
- `routeCode`
- `platformCode`
- `outputDir`

Expose:

- `launcherState`
- `updateStudentName`
- `updateOutputDir`
- `selectRoute`
- `selectPlatform`

- [ ] **Step 5: Run green test and commit**

Run:

```bash
npm run test
git diff --check
```

Commit:

```bash
git add features/lesson-launcher tests/lesson-launcher-state.test.mjs
git commit -m "feat: add lesson launcher state"
```

## Task 3: Launcher UI

**Files:**
- Create: `features/lesson-launcher/LessonLauncher.vue`
- Modify: `features/lesson-hub/LessonActionRail.vue`
- Modify: `assets/css/lesson-hub.css`
- Modify: `tests/architecture-contract.test.mjs`

- [ ] **Step 1: Write failing architecture test**

Add expected files:

```js
'features/lesson-launcher/LessonLauncher.vue',
'features/lesson-launcher/useLessonLauncherState.ts',
'features/lesson-launcher/lesson-launcher-state.ts'
```

Add them to the SLOC guard list.

- [ ] **Step 2: Run red test**

Run:

```bash
npm run test
```

Expected: architecture test fails until UI files are created.

- [ ] **Step 3: Build `LessonLauncher.vue`**

Render:

- title `Запуск урока`;
- student name input with label `Имя ученика`;
- output dir input with label `Папка session`;
- route buttons from `launcherState.routes`;
- platform buttons from `launcherState.platforms`;
- platform checks list;
- `CopyCommand` cards for every launch command;
- unavailable state for planned lessons.

- [ ] **Step 4: Wire into action rail**

In `LessonActionRail.vue`, import and render:

```vue
<LessonLauncher
  :track="state.selectedTrack"
  :lesson="state.selectedLesson"
/>
```

Place it directly under the role panel.

- [ ] **Step 5: Add responsive styles**

Add CSS classes:

- `.lesson-launcher`
- `.launcher-form-grid`
- `.launcher-option-grid`
- `.launcher-option`
- `.launcher-checks`
- `.launcher-command-stack`

Use 8px radius, restrained light theme, no nested cards beyond existing panel/card primitives.

- [ ] **Step 6: Run green test and commit**

Run:

```bash
npm run test
npm run build
git diff --check
```

Commit:

```bash
git add features/lesson-launcher features/lesson-hub/LessonActionRail.vue assets/css/lesson-hub.css tests/architecture-contract.test.mjs
git commit -m "feat: add lesson launcher UI"
```

## Task 4: E2E and Docs

**Files:**
- Modify: `tests/e2e/session-dashboard.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: Write failing e2e test**

Add a test:

```ts
test('builds a lesson launch packet from the hub', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Запуск урока' })).toBeVisible()
  await page.getByLabel('Имя ученика').fill('Мария')
  await page.getByRole('button', { name: 'Deep-dive path' }).click()
  await page.getByRole('button', { name: 'Windows + WSL2' }).click()
  await page.getByLabel('Папка session').fill('artifacts/sessions/maria')
  await expect(page.getByText('python3 mentor-lab.py session greenplum start --student "Мария" --route deep --output artifacts/sessions/maria')).toBeVisible()
  await expect(page.getByText('wsl --status')).toBeVisible()
})
```

- [ ] **Step 2: Run red e2e**

Run:

```bash
npm run test:e2e
```

Expected: fails until the UI is wired.

- [ ] **Step 3: Update README**

Add a `Lesson Launcher` section with:

- what it does;
- why commands are copyable instead of executed by the browser;
- required launcher catalog metadata;
- example `ACADEMY_CATALOG=/absolute/path/to/catalog.json npm run dev`.

- [ ] **Step 4: Run full verification and commit**

Run:

```bash
npm run build
npm run check
git diff --check
```

Commit:

```bash
git add README.md tests/e2e/session-dashboard.spec.ts
git commit -m "test: cover lesson launcher workflow"
```

## Task 5: Publish

**Files:**
- No source changes unless verification finds issues.

- [ ] **Step 1: Run final status checks**

Run:

```bash
git status --short --branch
git log --oneline --decorate --max-count=8
```

- [ ] **Step 2: Push branch**

Run:

```bash
git push -u origin codex/lesson-launcher
```

- [ ] **Step 3: Open stacked PR**

Create PR:

```bash
gh pr create \
  --draft \
  --base codex/academy-lesson-hub \
  --head codex/lesson-launcher \
  --title "[codex] Add lesson launcher" \
  --body-file /tmp/lesson-launcher-pr.md
```

The PR body must mention that it is stacked on PR #5 and should be retargeted to `master` after #5 merges.

- [ ] **Step 4: Watch CI**

Run:

```bash
gh pr checks --watch --interval 10
```

Expected: `Portal CI / build` succeeds.

## Self-Review

- Scope is one subsystem: Lesson Launcher inside the existing Academy Hub.
- The browser only generates/copies commands; it does not execute local CLI commands.
- Files remain under the 400 SLOC guard.
- New state is pure and independently tested before Vue wiring.
- E2E covers the core mentor workflow on desktop/mobile through the existing Playwright projects.
