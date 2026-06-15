# Post-Lesson Pack v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a one-screen post-lesson packet that lets a mentor copy one complete handoff after a live lesson.

**Architecture:** Add a focused `features/post-lesson-pack` module with a pure state builder, a thin browser-local composable, one Vue surface, and one CSS file. Reuse existing Review, Ledger and Submission state builders instead of recalculating their domain logic.

**Tech Stack:** Vue 3, Nuxt 3, TypeScript, browser-local `localStorage`, Node test runner, Playwright.

---

### Task 1: State Contract

**Files:**
- Create: `features/post-lesson-pack/post-lesson-pack-state.ts`
- Test: `tests/post-lesson-pack-state.test.mjs`

- [ ] **Step 1: Write failing state tests**

Assert that `buildPostLessonPackState(session, input)` returns:

- title `Demo Student · greenplum-partitioning`;
- readiness `needs-attention` when review risks or ledger blockers exist;
- sections for `lesson-summary`, `learner-handoff`, `homework`, `next-lesson`, `mentor-follow-up`;
- unresolved blockers from ledger/review/submission;
- `packetMarkdown` with `# Post-Lesson Pack`.

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test tests/post-lesson-pack-state.test.mjs
```

Expected: missing module failure.

- [ ] **Step 3: Implement pure state builder**

Create a compact builder that accepts mentor, ledger and submission snapshots; calls:

- `buildReviewCenterState`;
- `createReviewReportMarkdown`;
- `buildEvidenceLedgerState`;
- `buildSubmissionInboxState`.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
node --test tests/post-lesson-pack-state.test.mjs
```

Expected: pass.

### Task 2: Portal Surface

**Files:**
- Create: `features/post-lesson-pack/usePostLessonPackState.ts`
- Create: `features/post-lesson-pack/PostLessonPack.vue`
- Create: `assets/css/post-lesson-pack.css`
- Modify: `features/academy-portal/AcademyPortal.vue`
- Modify: `features/global-navigation/global-navigation-state.ts`
- Modify: `nuxt.config.ts`
- Test: `tests/architecture-contract.test.mjs`
- Test: `tests/global-navigation-state.test.mjs`

- [ ] **Step 1: Write failing architecture/navigation tests**

Assert that:

- new files exist;
- Nuxt loads `post-lesson-pack.css`;
- global navigation has `post-lesson`;
- invalid sessions disable `Post-Lesson Pack`;
- `AcademyPortal` renders `<PostLessonPack`.

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test tests/architecture-contract.test.mjs tests/global-navigation-state.test.mjs
```

Expected: missing files/surface failures.

- [ ] **Step 3: Implement surface integration**

Add `post-lesson` to `PortalSurface`, render `PostLessonPack`, and read browser-local snapshots through the composable.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
node --test tests/architecture-contract.test.mjs tests/global-navigation-state.test.mjs
```

Expected: pass.

### Task 3: End-to-End UX

**Files:**
- Modify: `tests/e2e/session-dashboard.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: Write failing e2e**

From current session:

- set evidence, ledger status/time/blocker and homework submission;
- open `Post-Lesson Pack`;
- assert packet summary, blocker, homework readiness and copy buttons;
- assert packet Markdown contains review, ledger and homework sections.

- [ ] **Step 2: Verify RED**

Run:

```bash
npx playwright test tests/e2e/session-dashboard.spec.ts -g "post-lesson"
```

Expected: missing surface failure.

- [ ] **Step 3: Implement UX polish and README**

Keep the UI dense, operational and consistent with existing surfaces.

- [ ] **Step 4: Verify full preflight**

Run:

```bash
npm run check
npm run build
git diff --check
```
