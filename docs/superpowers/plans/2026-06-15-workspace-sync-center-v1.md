# Workspace Sync Center v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `Workspace Sync Center`, a catalog-first portal surface that exports, validates and restores browser-local portal workspace packages.

**Architecture:** Add `features/workspace-sync` with a pure state builder for package grouping, validation, restore preview and Markdown export. Keep localStorage enumeration and restore writes in a thin composable; keep Vue as a rendering facade with explicit user actions. Only portal-owned localStorage prefixes are exported or restored.

**Tech Stack:** Vue 3, Nuxt 4, Vite, TypeScript, Node test runner, Playwright, existing portal localStorage utilities.

---

## File Structure

- Create `features/workspace-sync/workspace-sync-state.ts`: pure workspace package, validation, grouping, restore preview and Markdown summary.
- Create `features/workspace-sync/useWorkspaceSyncState.ts`: browser-local snapshot/restore facade.
- Create `features/workspace-sync/WorkspaceSyncCenter.vue`: rendered sync surface.
- Create `assets/css/workspace-sync.css`: responsive light-theme styles.
- Create `tests/workspace-sync-state.test.mjs`: package, validation and restore preview tests.
- Modify `features/global-navigation/global-navigation-state.ts`: add `sync`.
- Modify `features/academy-portal/AcademyPortal.vue`: render `WorkspaceSyncCenter`.
- Modify `nuxt.config.ts`: load `~/assets/css/workspace-sync.css`.
- Modify `tests/global-navigation-state.test.mjs`: order, guards and command.
- Modify `tests/architecture-contract.test.mjs`: new feature files, CSS and render assertion.
- Modify `tests/e2e/session-dashboard.spec.ts`: desktop/mobile Workspace Sync Center flow.
- Modify `README.md`: document Workspace Sync Center.

## Task 1: RED Workspace State Tests

**Files:**
- Create: `tests/workspace-sync-state.test.mjs`

- [ ] **Step 1: Add failing tests**

Create tests with these behaviors:

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadCatalog = async () => JSON.parse(await readFile('public/catalog.sample.json', 'utf-8'))
const loadSession = async () => JSON.parse(await readFile('public/session.sample.json', 'utf-8'))

test('buildWorkspaceSyncState exports only portal-owned records by group', async () => {
  const { buildWorkspaceSyncState, WORKSPACE_CONTRACT_VERSION } =
    await import('../features/workspace-sync/workspace-sync-state.ts')
  const catalog = await loadCatalog()
  const session = await loadSession()

  const state = buildWorkspaceSyncState({
    catalog,
    session,
    records: [
      { key: 'academy-portal-surface', value: 'authoring' },
      { key: 'lesson-authoring:academy-catalog/v1:2026:greenplum:01', value: { draft: true } },
      { key: 'mentor-cockpit:academy-session/v1:lab:student:created', value: { checkedEvidence: ['x'] } },
      { key: 'not-owned', value: { secret: true } }
    ],
    exportedAt: '2026-06-15T18:00:00Z'
  })

  assert.equal(state.package.contract_version, WORKSPACE_CONTRACT_VERSION)
  assert.equal(state.package.records.length, 3)
  assert.equal(state.package.records.some(record => record.key === 'not-owned'), false)
  assert.equal(state.groupSummaries.find(group => group.group === 'catalog')?.count, 1)
  assert.equal(state.groupSummaries.find(group => group.group === 'delivery')?.count, 1)
  assert.match(state.workspaceJson, /academy-workspace\\/v1/)
  assert.match(state.prBundleMarkdown, /Workspace Sync Bundle/)
})

test('parseWorkspaceImport validates bad json, bad version and unknown keys', async () => {
  const {
    parseWorkspaceImport,
    WORKSPACE_CONTRACT_VERSION
  } = await import('../features/workspace-sync/workspace-sync-state.ts')
  const catalog = await loadCatalog()

  assert.equal(parseWorkspaceImport('{bad', catalog, []).readiness, 'blocked')
  assert.equal(parseWorkspaceImport(JSON.stringify({ contract_version: 'bad', records: [] }), catalog, []).readiness, 'blocked')

  const parsed = parseWorkspaceImport(JSON.stringify({
    contract_version: WORKSPACE_CONTRACT_VERSION,
    exported_at: '2026-06-15T18:00:00Z',
    source: {
      catalog_version: catalog.contract_version,
      catalog_generated_at: catalog.generated_at
    },
    records: [{ key: 'unknown-key', group: 'unknown', value: {}, sizeBytes: 2, status: 'ready' }]
  }), catalog, [])

  assert.equal(parsed.readiness, 'blocked')
  assert.ok(parsed.issues.some(issue => issue.severity === 'blocker'))
})

test('parseWorkspaceImport previews create and update restore actions', async () => {
  const {
    parseWorkspaceImport,
    WORKSPACE_CONTRACT_VERSION
  } = await import('../features/workspace-sync/workspace-sync-state.ts')
  const catalog = await loadCatalog()
  const packageText = JSON.stringify({
    contract_version: WORKSPACE_CONTRACT_VERSION,
    exported_at: '2026-06-15T18:00:00Z',
    source: {
      catalog_version: catalog.contract_version,
      catalog_generated_at: catalog.generated_at
    },
    records: [
      { key: 'academy-portal-surface', group: 'portal', value: 'sync', sizeBytes: 6, status: 'ready' },
      { key: 'submission-inbox:academy-session/v1:lab:student:created', group: 'student', value: { status: 'ready' }, sizeBytes: 18, status: 'ready' }
    ]
  })

  const parsed = parseWorkspaceImport(packageText, catalog, [
    { key: 'academy-portal-surface', value: 'hub' }
  ])

  assert.equal(parsed.readiness, 'needs-review')
  assert.equal(parsed.preview?.createCount, 1)
  assert.equal(parsed.preview?.updateCount, 1)
  assert.equal(parsed.preview?.records.length, 2)
})
```

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test tests/workspace-sync-state.test.mjs
```

Expected: fail because `features/workspace-sync/workspace-sync-state.ts` does not exist.

## Task 2: GREEN Workspace State Builder

**Files:**
- Create: `features/workspace-sync/workspace-sync-state.ts`
- Test: `tests/workspace-sync-state.test.mjs`

- [ ] **Step 1: Implement pure state builder**

Implement:

```ts
export const WORKSPACE_CONTRACT_VERSION = 'academy-workspace/v1'
export type WorkspaceReadiness = 'ready' | 'needs-review' | 'blocked'
export type WorkspaceIssueSeverity = 'blocker' | 'warning'

export const buildWorkspaceSyncState = (input: WorkspaceSyncInput): WorkspaceSyncState => syncState
export const parseWorkspaceImport = (
  packageText: string,
  catalog: AcademyCatalog,
  currentRecords: WorkspaceRawRecord[]
): WorkspaceImportState => importState
export const isAllowedWorkspaceKey = (key: string): boolean => allowed
export const classifyWorkspaceKey = (key: string): WorkspaceRecordGroup => group
```

Rules:

- filter out non-owned keys from snapshot;
- calculate `sizeBytes` with `JSON.stringify(value).length`;
- group known prefixes exactly as spec;
- build `workspaceJson` with `contract_version`, `exported_at`, `source`, `records`;
- validation blockers: invalid JSON, bad version, missing records array, invalid key, disallowed key;
- validation warnings: empty package, null value, record size > 250 KB, catalog mismatch, key not present in current snapshot;
- restore preview counts create/update by comparing imported keys to current keys;
- Markdown summary lists groups, issue counts and restore preview.

- [ ] **Step 2: Verify GREEN**

Run:

```bash
node --test tests/workspace-sync-state.test.mjs
```

Expected: pass.

## Task 3: RED Navigation, Architecture And E2E

**Files:**
- Modify: `tests/global-navigation-state.test.mjs`
- Modify: `tests/architecture-contract.test.mjs`
- Modify: `tests/e2e/session-dashboard.spec.ts`

- [ ] **Step 1: Update navigation expectations**

Expected order:

```js
[
  'hub',
  'authoring',
  'sync',
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
command.id === 'open-sync' &&
command.label === 'Открыть Workspace Sync Center'
```

- [ ] **Step 2: Update architecture expectations**

Add:

```js
'assets/css/workspace-sync.css'
'features/workspace-sync/WorkspaceSyncCenter.vue'
'features/workspace-sync/useWorkspaceSyncState.ts'
'features/workspace-sync/workspace-sync-state.ts'
```

Assert Nuxt config includes `~/assets/css/workspace-sync.css` and AcademyPortal renders `<WorkspaceSyncCenter`.

- [ ] **Step 3: Add E2E flow**

Add Playwright scenario:

```js
test('exports and imports a workspace package from sync center', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Lesson Authoring Studio' }).click()
  await page.getByLabel('Stage 1 question').fill('')
  await page.getByRole('button', { name: 'Workspace Sync Center' }).click()

  await expect(page.getByRole('heading', { name: 'Workspace Sync Center' })).toBeVisible()
  await expect(page.getByLabel('Workspace snapshot summary')).toBeVisible()
  await expect(page.getByLabel('Workspace records')).toBeVisible()
  await expect(page.getByLabel('Workspace validation')).toBeVisible()
  await expect(page.getByLabel('Workspace import restore')).toBeVisible()
  await expect(page.getByLabel('Workspace PR bundle')).toBeVisible()

  const workspaceJson = await page.getByLabel('Workspace package JSON').inputValue()
  await page.getByLabel('Import workspace JSON').fill(workspaceJson)
  await expect(page.getByText('ready to restore')).toBeVisible()
  await page.getByRole('button', { name: 'Restore workspace' }).click()
  await expect(page.getByText('Workspace restored')).toBeVisible()
})
```

- [ ] **Step 4: Verify RED**

Run:

```bash
node --test tests/global-navigation-state.test.mjs tests/architecture-contract.test.mjs
npx playwright test tests/e2e/session-dashboard.spec.ts -g "workspace package"
```

Expected: fail because `sync` surface and component do not exist yet.

## Task 4: GREEN Navigation And Portal Wiring

**Files:**
- Modify: `features/global-navigation/global-navigation-state.ts`
- Modify: `features/academy-portal/AcademyPortal.vue`
- Modify: `nuxt.config.ts`

- [ ] **Step 1: Add `sync` surface**

Add `sync` to `PortalSurface`, `PORTAL_SURFACES`, `CATALOG_REQUIRED_SURFACES` and `SURFACE_COPY`. It requires catalog, not session.

- [ ] **Step 2: Render Sync Center**

Import `WorkspaceSyncCenter` in `AcademyPortal.vue` and render it when `surface === 'sync'`.

- [ ] **Step 3: Register CSS**

Add `~/assets/css/workspace-sync.css` to `nuxt.config.ts`.

## Task 5: Composable, UI And CSS

**Files:**
- Create: `features/workspace-sync/useWorkspaceSyncState.ts`
- Create: `features/workspace-sync/WorkspaceSyncCenter.vue`
- Create: `assets/css/workspace-sync.css`

- [ ] **Step 1: Implement composable**

The composable must:

- enumerate `window.localStorage`;
- parse JSON values when possible, keep string values as strings;
- filter allowed keys through the state builder;
- expose `syncState`, `importText`, `importState`, `refreshSnapshot`, `setImportText`, `restoreImport`, `copyWorkspaceJson`;
- restore writes only imported records when `readiness !== 'blocked'`.

- [ ] **Step 2: Implement UI**

The component must render:

- heading `Workspace Sync Center`;
- snapshot summary metrics;
- records table/list;
- validation issues;
- workspace package JSON textarea;
- import JSON textarea;
- restore preview and restore button;
- PR bundle textarea.

- [ ] **Step 3: Implement CSS**

Use restrained light theme:

- no hero layout;
- no gradients/orbs;
- radius <= `8px`;
- responsive grids and table fallback;
- mobile layout without horizontal overflow.

## Task 6: Documentation And Full Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document Sync Center**

Add `Workspace Sync Center` to intro, TOC, Global Navigation list and architecture. Add a dedicated section explaining:

- why backup/restore exists;
- allowed localStorage prefixes;
- export/import/restore workflow;
- browser-only limitations.

- [ ] **Step 2: Targeted verification**

Run:

```bash
node --test tests/workspace-sync-state.test.mjs tests/global-navigation-state.test.mjs tests/architecture-contract.test.mjs
npx playwright test tests/e2e/session-dashboard.spec.ts -g "workspace package"
```

Expected: pass.

- [ ] **Step 3: Full verification**

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

- [ ] **Step 1: Commit and push feature**

```bash
git add .
git commit -m "feat: add workspace sync center"
git push -u origin codex/workspace-sync-center-v1
```

- [ ] **Step 2: Open PR**

Create PR to `master` with summary, architecture and verification evidence.

- [ ] **Step 3: Merge after green CI**

Wait for GitHub Actions and merge only after success.

- [ ] **Step 4: Release v0.10.0**

After merge:

```bash
npm version 0.10.0 --no-git-tag-version
```

Add changelog section `v0.10.0 - Workspace Sync Center`, run full checks, commit `chore: release portal v0.10.0`, push `master`, tag `v0.10.0`, and create GitHub Release.

## Self-Review

- Spec coverage: all sections in `2026-06-15-workspace-sync-center-v1-design.md` map to tasks 1-7.
- Placeholder scan: no unresolved work markers and no incomplete test steps.
- Type consistency: `sync`, `WorkspaceSyncState`, `AcademyWorkspacePackage`, `WorkspaceRecord` and `WORKSPACE_CONTRACT_VERSION` stay consistent across tasks.
