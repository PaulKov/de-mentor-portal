# Lesson Run Evidence Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mentor-facing Lesson Run Timeline / Evidence Ledger that records stage status, actual time, evidence, notes, blockers, and a copy-ready handoff summary during a live session.

**Architecture:** Add a focused `features/evidence-ledger` module with a pure state builder, a thin browser-local composable, and one Vue component embedded in `Mentor Live Cockpit`. Keep existing mentor notes/evidence as the source of truth and store only ledger-specific fields separately.

**Tech Stack:** Vue 3, Nuxt 3, TypeScript, Node test runner, Playwright, browser `localStorage`.

---

### Task 1: Pure Ledger State

**Files:**
- Create: `features/evidence-ledger/evidence-ledger-state.ts`
- Test: `tests/evidence-ledger-state.test.mjs`

- [ ] **Step 1: Write RED tests**

```js
test('buildEvidenceLedgerState summarizes stages with status, evidence and handoff', () => {
  const state = buildEvidenceLedgerState(session, {
    checkedEvidence: ['Partition pruning'],
    notesByStage: { 'partition-pruning': 'Ученик показал EXPLAIN pruning.' },
    stageStatuses: { 'partition-pruning': 'done', statistics: 'risk' },
    actualMinutesByStage: { 'partition-pruning': 18 },
    blockersByStage: { statistics: 'Нет before/after EXPLAIN.' }
  })

  assert.equal(state.rows.length, 3)
  assert.equal(state.rows[1].status, 'done')
  assert.equal(state.rows[1].plannedMinutes, 15)
  assert.equal(state.rows[1].actualMinutes, 18)
  assert.equal(state.rows[1].evidenceChecked, 1)
  assert.equal(state.rows[2].blocker, 'Нет before/after EXPLAIN.')
  assert.equal(state.summary.done, 1)
  assert.equal(state.summary.risk, 1)
  assert.ok(state.handoffMarkdown.includes('## Stage Ledger'))
})
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/evidence-ledger-state.test.mjs`

Expected: FAIL because `features/evidence-ledger/evidence-ledger-state.ts` does not exist.

- [ ] **Step 3: Implement minimal pure state**

Implement exported types, `buildEvidenceLedgerState`, `normalizeEvidenceLedgerLocalState`, `createEvidenceLedgerStorageKey`, `createEvidenceLedgerMarkdown`, `parseStageTimeboxMinutes`.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/evidence-ledger-state.test.mjs`

Expected: PASS.

### Task 2: Browser-Local Facade

**Files:**
- Create: `features/evidence-ledger/useEvidenceLedgerState.ts`
- Modify: `features/mentor-cockpit/useMentorCockpitState.ts`
- Test: `tests/architecture-contract.test.mjs`

- [ ] **Step 1: Write RED contract assertions**

Add expected files under `features/evidence-ledger` and assert every new source module remains under 400 SLOC.

- [ ] **Step 2: Implement composable**

Expose `ledgerState`, `setStageStatus`, `setActualMinutes`, `setBlocker`, and `resetStageLedger`. Persist only ledger-local fields under:

```text
evidence-ledger:<contract_version>:<lab_name>:<student_name>:<created_at>
```

- [ ] **Step 3: Expose mentor notes**

Return `notesByStage` from `useMentorCockpitState` so the ledger can summarize all stages, not only the selected stage.

### Task 3: Vue UI And Styles

**Files:**
- Create: `features/evidence-ledger/EvidenceLedger.vue`
- Create: `assets/css/evidence-ledger.css`
- Modify: `features/mentor-cockpit/MentorCockpit.vue`
- Modify: `nuxt.config.ts`
- Test: `tests/e2e/session-dashboard.spec.ts`

- [ ] **Step 1: Write RED e2e**

Expect `Lesson run evidence ledger`, rows for all stages, stage status controls, actual time input, blocker input, and Markdown export.

- [ ] **Step 2: Implement component**

Render a dense operational panel below `DeliveryControlRoom` with status segmented controls, evidence counters, note/blocker indicators, actual time controls, and copy-ready Markdown textarea.

- [ ] **Step 3: Register CSS**

Add `~/assets/css/evidence-ledger.css` to Nuxt config and keep layout responsive without horizontal overflow.

### Task 4: Documentation And Full Verification

**Files:**
- Modify: `README.md`
- Modify: `tests/architecture-contract.test.mjs`

- [ ] **Step 1: Add README section**

Document the workflow, storage key, and how Ledger relates to Control Room, Review Center, and Cohort Dashboard.

- [ ] **Step 2: Run checks**

Run:

```bash
npm run check
npm run build
git diff --check
```

Expected: all pass.

- [ ] **Step 3: Browser QA**

Open production preview and verify desktop/mobile: ledger renders, status changes persist, actual time updates, blocker appears in Markdown, no console errors, no horizontal overflow.
