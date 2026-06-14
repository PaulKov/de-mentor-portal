import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadSample = async () => JSON.parse(await readFile('public/session.sample.json', 'utf-8'))

test('createSessionWorkspaceEntry builds deterministic session identity', async () => {
  const {
    createSessionWorkspaceEntry,
    summarizeWorkspaceEntry
  } = await import('../features/session-workspace/session-workspace-state.ts')
  const session = await loadSample()

  const entry = createSessionWorkspaceEntry(
    session,
    'session.sample.json',
    '2026-06-14T12:00:00'
  )
  const summary = summarizeWorkspaceEntry(entry)

  assert.equal(
    entry.id,
    'academy-session-v1:greenplum-partitioning:demo-student:2026-06-14t10-00-00:session-sample-json'
  )
  assert.equal(entry.importedAt, '2026-06-14T12:00:00')
  assert.equal(entry.sourceName, 'session.sample.json')
  assert.equal(summary.studentName, 'Demo Student')
  assert.equal(summary.labName, 'greenplum-partitioning')
  assert.equal(summary.currentStageTitle, 'Partition pruning and retention')
  assert.equal(summary.stageCount, 3)
  assert.equal(summary.evidenceCount, 2)
  assert.equal(summary.lastEventLabel, 'Событий пока нет')
})

test('buildSessionWorkspaceState sorts recent runs and falls back to newest selection', async () => {
  const {
    buildSessionWorkspaceState,
    createSessionWorkspaceEntry
  } = await import('../features/session-workspace/session-workspace-state.ts')
  const sample = await loadSample()
  const olderSession = {
    ...sample,
    student_name: 'Анна',
    created_at: '2026-06-13T09:00:00'
  }
  const newestSession = {
    ...sample,
    student_name: 'Борис',
    created_at: '2026-06-15T09:00:00'
  }
  const older = createSessionWorkspaceEntry(olderSession, 'anna.json', '2026-06-13T09:30:00')
  const newest = createSessionWorkspaceEntry(newestSession, 'boris.json', '2026-06-15T09:30:00')

  const state = buildSessionWorkspaceState([older, newest], 'missing')

  assert.equal(state.entries.length, 2)
  assert.equal(state.entries[0].id, newest.id)
  assert.equal(state.selectedEntry?.id, newest.id)
  assert.equal(state.totalStages, 6)
  assert.equal(state.studentCount, 2)
  assert.deepEqual(
    state.summaries.map(summary => summary.studentName),
    ['Борис', 'Анна']
  )
})

test('createSessionWorkspaceStorageKey is scoped to contract version', async () => {
  const {
    createSessionWorkspaceStorageKey
  } = await import('../features/session-workspace/session-workspace-state.ts')

  assert.equal(
    createSessionWorkspaceStorageKey(),
    'session-workspace:academy-session/v1'
  )
})
