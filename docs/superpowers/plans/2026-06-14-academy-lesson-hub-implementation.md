# Academy Lesson Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `Academy Lesson Hub`, a catalog-first portal home screen with tracks, lessons, readiness, materials and mentor/student commands.

**Architecture:** Add a separate `core/catalog` bounded context with domain types, contract validation, loader and HTTP source. Keep `academy-session/v1` unchanged. Add `features/academy-portal` as a thin composition facade and `features/lesson-hub` as the UI/state feature; `app.vue` remains a small Nuxt facade.

**Tech Stack:** Vue 3, Nuxt 3, TypeScript, Node test runner, Playwright, existing CSS token system and `createSafeLocalStoragePort`.

---

### Task 1: Catalog Contract And Loader

**Files:**
- Create: `core/catalog/domain/academy-catalog.ts`
- Create: `core/catalog/application/catalog-contract.ts`
- Create: `core/catalog/application/catalog-loader.ts`
- Create: `core/catalog/infrastructure/http-catalog-source.ts`
- Create: `composables/useCatalogState.ts`
- Create: `server/api/catalog.get.ts`
- Create: `contracts/academy-catalog/v1/README.md`
- Create: `contracts/academy-catalog/v1/catalog.sample.json`
- Create: `public/catalog.sample.json`
- Modify: `tests/architecture-contract.test.mjs`
- Test: `tests/catalog-contract.test.mjs`

- [ ] **Step 1: Write failing tests**

Create tests asserting:

```js
assert.equal(catalog.contract_version, 'academy-catalog/v1')
assert.equal(validation.valid, true)
assert.equal(broken.valid, false)
assert.ok(validated.catalog.tracks.some(track => track.code === 'greenplum'))
```

- [ ] **Step 2: Verify RED**

Run: `npm run test`
Expected: FAIL because `core/catalog` and sample catalog do not exist.

- [ ] **Step 3: Implement domain, validator and loader**

Implement contract validation for top-level fields, tracks, lessons, readiness, materials and commands. Keep validator explicit and small; do not introduce a schema library.

- [ ] **Step 4: Implement source plumbing**

Add `/api/catalog` with candidate order:

```text
ACADEMY_CATALOG
public/catalog.json
public/catalog.sample.json
```

Add `useCatalogState()` mirroring `useSessionState()`.

- [ ] **Step 5: Verify GREEN**

Run: `npm run test && npm run validate:session -- public/session.sample.json`
Expected: PASS.

### Task 2: Lesson Hub Pure State

**Files:**
- Create: `features/lesson-hub/lesson-hub-state.ts`
- Create: `features/lesson-hub/useLessonHubState.ts`
- Test: `tests/lesson-hub-state.test.mjs`

- [ ] **Step 1: Write failing tests**

Test that state builder:

```js
const state = buildLessonHubState(catalog, { trackCode: 'spark', role: 'student' })
assert.equal(state.selectedTrack.code, 'spark')
assert.equal(state.selectedRole, 'student')
assert.ok(state.selectedLesson.student_commands.length > 0)
assert.ok(state.trackSummaries.length >= 5)
```

Also test storage key:

```js
assert.equal(createLessonHubStorageKey(catalog), `academy-lesson-hub:${catalog.contract_version}:${catalog.generated_at}`)
```

- [ ] **Step 2: Verify RED**

Run: `npm run test`
Expected: FAIL because `lesson-hub-state.ts` does not exist.

- [ ] **Step 3: Implement pure state builder**

Normalize track, lesson and role. Fall back to `default_track` and first lesson when persisted values are missing.

- [ ] **Step 4: Implement persistence facade**

`useLessonHubState(catalogRef)` stores `{ trackCode, lessonCode, role }` in `localStorage` after mounted, preserving fast user actions before storage load.

- [ ] **Step 5: Verify GREEN**

Run: `npm run test`
Expected: PASS.

### Task 3: Hub UI And Portal Composition

**Files:**
- Create: `features/academy-portal/AcademyPortal.vue`
- Create: `features/lesson-hub/LessonHub.vue`
- Create: `features/lesson-hub/TrackNavigation.vue`
- Create: `features/lesson-hub/LessonList.vue`
- Create: `features/lesson-hub/LessonActionRail.vue`
- Create: `assets/css/lesson-hub.css`
- Modify: `app.vue`
- Modify: `nuxt.config.ts`
- Modify: `tests/e2e/session-dashboard.spec.ts`
- Modify: `tests/architecture-contract.test.mjs`

- [ ] **Step 1: Write failing architecture and e2e checks**

E2E should assert:

```ts
await expect(page.getByRole('heading', { name: 'Academy Lesson Hub' })).toBeVisible()
await page.getByRole('button', { name: 'Spark' }).click()
await page.getByRole('button', { name: 'Ученик' }).click()
await expect(page.getByText('spark on yarn')).toBeVisible()
await expect(page.getByText('python3 mentor-lab.py runbook spark intro student')).toBeVisible()
await page.getByRole('button', { name: 'Открыть текущую сессию' }).click()
await expect(page.getByRole('heading', { name: 'Mentor Live Cockpit' })).toBeVisible()
```

- [ ] **Step 2: Verify RED**

Run: `npm run test && npm run test:e2e`
Expected: FAIL because Hub UI is not implemented.

- [ ] **Step 3: Implement UI components**

Use existing visual language: `Panel`, `CopyButton`, `CopyCommand`, `StatusBadge`, `DashboardModeSwitch`. Keep cards un-nested; copy commands render as command cards only in action rail.

- [ ] **Step 4: Wire app composition**

`app.vue` loads both catalog and session and delegates to `AcademyPortal`. If catalog is valid, show Hub first; if catalog is unavailable, fall back to existing `SessionDashboard`.

- [ ] **Step 5: Verify GREEN**

Run: `npm run test && npm run test:e2e`
Expected: PASS.

### Task 4: Documentation, Build, QA And Merge

**Files:**
- Modify: `README.md`
- Verify: all changed source files

- [ ] **Step 1: Update README**

Document `Academy Lesson Hub`, `academy-catalog/v1`, `ACADEMY_CATALOG`, `public/catalog.sample.json` and the fallback to session view.

- [ ] **Step 2: Run full checks**

```bash
npm run test
npm run validate:session -- public/session.sample.json
npm run build
npm run test:e2e
npm run check
git diff --check
```

- [ ] **Step 3: Browser QA**

Use Browser/IAB first if available. Validate:

`Hub loads -> Spark track selected -> student role shows student commands -> current session opens -> mobile layout remains readable -> console has no relevant warnings/errors`.

- [ ] **Step 4: PR and merge**

```bash
git add .
git commit -m "feat: add academy lesson hub"
git push -u origin codex/academy-lesson-hub
gh pr create --base master --head codex/academy-lesson-hub --title "feat: add academy lesson hub"
gh pr checks <pr> --watch
gh pr merge <pr> --merge --delete-branch
```
