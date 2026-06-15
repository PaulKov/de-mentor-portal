import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadSession = async () => JSON.parse(await readFile('public/session.sample.json', 'utf-8'))

test('buildEvidenceLedgerState summarizes stages with status, evidence and handoff', async () => {
  const {
    buildEvidenceLedgerState
  } = await import('../features/evidence-ledger/evidence-ledger-state.ts')
  const session = await loadSession()

  const state = buildEvidenceLedgerState(session, {
    checkedEvidence: ['Partition pruning'],
    notesByStage: {
      'partition-pruning': 'Ученик показал EXPLAIN pruning.'
    },
    stageStatuses: {
      'partition-pruning': 'done',
      statistics: 'risk'
    },
    actualMinutesByStage: {
      'partition-pruning': 18
    },
    blockersByStage: {
      statistics: 'Нет before/after EXPLAIN.'
    }
  })

  assert.equal(state.title, 'Demo Student · greenplum-partitioning')
  assert.equal(state.rows.length, 3)
  assert.equal(state.rows[1].code, 'partition-pruning')
  assert.equal(state.rows[1].status, 'done')
  assert.equal(state.rows[1].plannedMinutes, 15)
  assert.equal(state.rows[1].actualMinutes, 18)
  assert.equal(state.rows[1].evidenceChecked, 1)
  assert.equal(state.rows[1].evidenceTotal, 1)
  assert.equal(state.rows[1].note, 'Ученик показал EXPLAIN pruning.')
  assert.equal(state.rows[2].status, 'risk')
  assert.equal(state.rows[2].blocker, 'Нет before/after EXPLAIN.')
  assert.equal(state.summary.done, 1)
  assert.equal(state.summary.risk, 1)
  assert.equal(state.summary.pending, 1)
  assert.equal(state.summary.evidenceChecked, 1)
  assert.equal(state.summary.evidenceTotal, 2)
  assert.equal(state.summary.evidencePercent, 50)
  assert.equal(state.summary.plannedMinutes, 40)
  assert.equal(state.summary.actualMinutes, 43)
  assert.equal(state.summary.deltaMinutes, 3)
  assert.ok(state.handoffMarkdown.includes('## Stage Ledger'))
  assert.ok(state.handoffMarkdown.includes('- 10:00-25:00 Partition pruning and retention: done'))
  assert.ok(state.handoffMarkdown.includes('blocker: Нет before/after EXPLAIN.'))
})

test('normalizeEvidenceLedgerLocalState accepts only known statuses and bounded actual minutes', async () => {
  const {
    normalizeEvidenceLedgerLocalState
  } = await import('../features/evidence-ledger/evidence-ledger-state.ts')

  assert.deepEqual(
    normalizeEvidenceLedgerLocalState({
      stageStatuses: {
        replay: 'broken',
        statistics: 'skipped'
      },
      actualMinutesByStage: {
        replay: -10,
        statistics: 500
      },
      blockersByStage: {
        replay: 42,
        statistics: 'Needs follow-up'
      }
    }),
    {
      stageStatuses: {
        statistics: 'skipped'
      },
      actualMinutesByStage: {
        replay: 0,
        statistics: 240
      },
      blockersByStage: {
        statistics: 'Needs follow-up'
      }
    }
  )
})

test('createEvidenceLedgerStorageKey isolates state by session identity', async () => {
  const {
    createEvidenceLedgerStorageKey
  } = await import('../features/evidence-ledger/evidence-ledger-state.ts')

  assert.equal(
    createEvidenceLedgerStorageKey(await loadSession()),
    'evidence-ledger:academy-session/v1:greenplum-partitioning:Demo Student:2026-06-14T10:00:00'
  )
})
