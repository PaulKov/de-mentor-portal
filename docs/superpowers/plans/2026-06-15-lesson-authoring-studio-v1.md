# Lesson Authoring Studio v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `Lesson Authoring Studio`, a portal surface for assembling, validating, previewing and exporting a lesson package from the existing academy catalog.

**Architecture:** Add a feature-oriented module under `features/lesson-authoring`. Keep lesson scoring and export generation in a pure state builder, browser persistence in a thin composable, and rendering in a Vue facade. Reuse catalog/session contracts and existing navigation patterns; do not write repo files from the browser.

**Tech Stack:** Vue 3, Nuxt 4, Vite, TypeScript, Node test runner, Playwright, existing portal localStorage utilities.

---

## File Structure

- Create `features/lesson-authoring/lesson-authoring-state.ts`: pure draft normalization, quality gate, preview and exports.
- Create `features/lesson-authoring/useLessonAuthoringState.ts`: browser-local draft facade and selection persistence.
- Create `features/lesson-authoring/LessonAuthoringStudio.vue`: authoring UI surface.
- Create `assets/css/lesson-authoring.css`: responsive light-theme styles.
- Create `tests/lesson-authoring-state.test.mjs`: state, quality gate and export tests.
- Modify `features/global-navigation/global-navigation-state.ts`: add `authoring`.
- Modify `features/academy-portal/AcademyPortal.vue`: render `LessonAuthoringStudio`.
- Modify `nuxt.config.ts`: load `~/assets/css/lesson-authoring.css`.
- Modify `tests/global-navigation-state.test.mjs`: order, guards and command.
- Modify `tests/architecture-contract.test.mjs`: new feature files, CSS and render assertion.
- Modify `tests/e2e/session-dashboard.spec.ts`: desktop/mobile Authoring Studio flow.
- Modify `README.md`: document Authoring Studio workflow.

## Task 1: RED State Builder Tests

**Files:**
- Create: `tests/lesson-authoring-state.test.mjs`

- [ ] **Step 1: Add state tests**

Create the test file with three behaviors:

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadCatalog = async () => JSON.parse(await readFile('public/catalog.sample.json', 'utf-8'))

test('buildLessonAuthoringState creates a ready draft from sample catalog', async () => {
  const { buildLessonAuthoringState } =
    await import('../features/lesson-authoring/lesson-authoring-state.ts')
  const state = buildLessonAuthoringState(await loadCatalog(), {
    trackCode: 'greenplum',
    lessonCode: '01-greenplum-foundations'
  })

  assert.equal(state.selectedTrack.code, 'greenplum')
  assert.equal(state.selectedLesson.code, '01-greenplum-foundations')
  assert.equal(state.stageRows.length > 0, true)
  assert.equal(state.qualityChecks.some(check => check.severity === 'blocker'), false)
  assert.equal(state.readinessScore >= 85, true)
  assert.match(state.exports.catalogPatchMarkdown, /Greenplum Foundations/)
})

test('buildLessonAuthoringState explains blockers for an incomplete draft', async () => {
  const { buildLessonAuthoringState } =
    await import('../features/lesson-authoring/lesson-authoring-state.ts')
  const state = buildLessonAuthoringState(await loadCatalog(), {
    trackCode: 'greenplum',
    lessonCode: '01-greenplum-foundations',
    draft: {
      totalMinutes: 0,
      stages: [
        {
          code: 'empty',
          title: 'Empty stage',
          durationMinutes: 0,
          mentorAction: '',
          studentAction: '',
          command: '',
          question: '',
          evidence: ''
        }
      ],
      homeworkTasks: []
    }
  })

  assert.equal(state.readiness, 'blocked')
  assert.equal(state.qualityChecks.filter(check => check.severity === 'blocker').length >= 4, true)
  assert.match(state.exports.qualityReportMarkdown, /Blockers/)
})

test('normalizeLessonAuthoringDraft rejects broken browser payloads', async () => {
  const { normalizeLessonAuthoringDraft } =
    await import('../features/lesson-authoring/lesson-authoring-state.ts')

  assert.deepEqual(normalizeLessonAuthoringDraft(null), {})
  assert.deepEqual(normalizeLessonAuthoringDraft({ stages: 'bad', totalMinutes: -10 }), {})
})
```

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test tests/lesson-authoring-state.test.mjs
```

Expected: fail because `features/lesson-authoring/lesson-authoring-state.ts` does not exist.

## Task 2: GREEN State Builder

**Files:**
- Create: `features/lesson-authoring/lesson-authoring-state.ts`
- Test: `tests/lesson-authoring-state.test.mjs`

- [ ] **Step 1: Implement pure state builder**

Implement exported types:

```ts
export type AuthoringSeverity = 'blocker' | 'warning' | 'ok'
export type AuthoringReadiness = 'ready' | 'needs-work' | 'blocked'

export interface LessonAuthoringInput {
  trackCode?: string
  lessonCode?: string
  draft?: Partial<LessonAuthoringDraft> | null
}
```

Implement functions:

```ts
export const normalizeLessonAuthoringDraft = (
  draft: Partial<LessonAuthoringDraft> | null | undefined
): Partial<LessonAuthoringDraft> => normalizedDraft

export const buildLessonAuthoringState = (
  catalog: AcademyCatalog,
  input: LessonAuthoringInput = {}
): LessonAuthoringState => authoringState

export const createLessonAuthoringStorageKey = (
  catalog: AcademyCatalog,
  trackCode: string,
  lessonCode: string
) => ['lesson-authoring', catalog.contract_version, catalog.generated_at, trackCode, lessonCode].join(':')
```

Rules:

- select requested track/lesson, then fallback to default track and first lesson;
- derive default draft from catalog lesson and launcher routes;
- derive stage rows from draft stages;
- calculate blockers/warnings exactly as the design spec states;
- score is `Math.max(0, Math.min(100, 100 - blockers * 18 - warnings * 7))`;
- readiness is `blocked`, `needs-work` or `ready`;
- exports include `catalogPatchMarkdown`, `lessonPackageJson`, `sessionSeedJson`, `qualityReportMarkdown`.

- [ ] **Step 2: Verify GREEN**

Run:

```bash
node --test tests/lesson-authoring-state.test.mjs
```

Expected: all tests pass.

## Task 3: RED Navigation, Architecture And E2E

**Files:**
- Modify: `tests/global-navigation-state.test.mjs`
- Modify: `tests/architecture-contract.test.mjs`
- Modify: `tests/e2e/session-dashboard.spec.ts`

- [ ] **Step 1: Update navigation test expectations**

Expected surface order:

```js
[
  'hub',
  'authoring',
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
command.id === 'open-authoring' &&
command.label === 'Открыть Lesson Authoring Studio'
```

- [ ] **Step 2: Update architecture contract expectations**

Add:

```js
'assets/css/lesson-authoring.css'
'features/lesson-authoring/LessonAuthoringStudio.vue'
'features/lesson-authoring/useLessonAuthoringState.ts'
'features/lesson-authoring/lesson-authoring-state.ts'
```

Assert `nuxt.config.ts` includes `~/assets/css/lesson-authoring.css` and `AcademyPortal.vue` renders `<LessonAuthoringStudio`.

- [ ] **Step 3: Add E2E flow**

Add a Playwright scenario:

```js
test('opens lesson authoring studio and recalculates quality gate', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Lesson Authoring Studio' }).click()

  await expect(page.getByRole('heading', { name: 'Lesson Authoring Studio' })).toBeVisible()
  await expect(page.getByLabel('Authoring quality gate')).toBeVisible()
  await expect(page.getByLabel('Authoring stage matrix')).toBeVisible()
  await expect(page.getByLabel('Authoring preview')).toBeVisible()
  await expect(page.getByLabel('Authoring exports')).toBeVisible()

  await page.getByLabel('Stage 1 question').fill('')
  await expect(page.getByText('Stage без question')).toBeVisible()
})
```

- [ ] **Step 4: Verify RED**

Run:

```bash
node --test tests/global-navigation-state.test.mjs tests/architecture-contract.test.mjs
npx playwright test tests/e2e/session-dashboard.spec.ts -g "authoring"
```

Expected: fail because `authoring` surface and component do not exist yet.

## Task 4: GREEN Navigation And Portal Wiring

**Files:**
- Modify: `features/global-navigation/global-navigation-state.ts`
- Modify: `features/academy-portal/AcademyPortal.vue`
- Modify: `nuxt.config.ts`

- [ ] **Step 1: Add surface**

Add `authoring` to `PortalSurface`, `PORTAL_SURFACES`, `CATALOG_REQUIRED_SURFACES` and `SURFACE_COPY`.

The surface must require catalog but not session.

- [ ] **Step 2: Wire component placeholder**

Import and render `LessonAuthoringStudio` in `AcademyPortal.vue` when `navigation.activeSurface === 'authoring'`.

- [ ] **Step 3: Register CSS**

Add `~/assets/css/lesson-authoring.css` to `nuxt.config.ts`.

## Task 5: Composable, UI And CSS

**Files:**
- Create: `features/lesson-authoring/useLessonAuthoringState.ts`
- Create: `features/lesson-authoring/LessonAuthoringStudio.vue`
- Create: `assets/css/lesson-authoring.css`
- Test: `tests/e2e/session-dashboard.spec.ts`

- [ ] **Step 1: Implement composable**

Use existing localStorage pattern:

- compute selected track/lesson;
- read draft from `createLessonAuthoringStorageKey`;
- call `buildLessonAuthoringState`;
- expose `updateStage`, `updateDraft`, `resetDraft`, `copyExport`.

- [ ] **Step 2: Implement UI**

The component must render:

- heading `Lesson Authoring Studio`;
- readiness score and blockers/warnings;
- track/lesson selectors;
- editable stage matrix;
- quality gate list;
- mentor/student preview;
- export textareas/buttons.

- [ ] **Step 3: Implement CSS**

Use restrained light theme:

- no hero layout;
- no gradients/orbs;
- radius <= `8px`;
- responsive grid with one-column mobile layout;
- fixed min-width-safe controls to avoid overflow.

## Task 6: Documentation And Full Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document surface**

Add `Lesson Authoring Studio` to intro, TOC, Global Navigation list and architecture section. Add a dedicated section explaining:

- when to use it;
- quality gate;
- preview;
- export workflow;
- current browser-only limitations.

- [ ] **Step 2: Run targeted checks**

Run:

```bash
node --test tests/lesson-authoring-state.test.mjs tests/global-navigation-state.test.mjs tests/architecture-contract.test.mjs
npx playwright test tests/e2e/session-dashboard.spec.ts -g "authoring"
```

Expected: pass.

- [ ] **Step 3: Run full checks**

Run:

```bash
npm run check
npm run build
git diff --check
```

Expected: pass.

## Task 7: PR, Merge And Release

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Commit implementation**

Commit feature and docs:

```bash
git add .
git commit -m "feat: add lesson authoring studio"
git push -u origin codex/lesson-authoring-studio-v1
```

- [ ] **Step 2: Open PR**

Create PR to `master` with summary and verification evidence.

- [ ] **Step 3: Merge after green CI**

Wait for GitHub Actions. Merge only after CI success.

- [ ] **Step 4: Release v0.9.0**

After merge:

```bash
npm version 0.9.0 --no-git-tag-version
```

Add `CHANGELOG.md` section `v0.9.0 - Lesson Authoring Studio`, run full checks, commit `chore: release portal v0.9.0`, push `master`, tag `v0.9.0`, and create GitHub Release.

## Self-Review

- Spec coverage: all sections in `2026-06-15-lesson-authoring-studio-v1-design.md` map to tasks 1-7.
- Placeholder scan: no incomplete "add tests later" steps and no unresolved work markers.
- Type consistency: `authoring`, `LessonAuthoringState`, `LessonAuthoringDraft`, `AuthoringQualityCheck` and storage key names stay consistent across tasks.
