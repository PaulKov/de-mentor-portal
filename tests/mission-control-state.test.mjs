import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadSession = async () => JSON.parse(await readFile('public/session.sample.json', 'utf-8'))

const createCompleteSubmissionState = async session => {
  const {
    buildSubmissionChecklist,
    createSubmissionRecord
  } = await import('../features/submission-inbox/submission-inbox-state.ts')
  const checklist = buildSubmissionChecklist(session)
  const draft = {
    evidenceByItem: {
      'self-check': 'doctor ok; release verify ok',
      'skill:partition-pruning': 'EXPLAIN shows selected partitions only',
      'skill:statistics': 'ANALYZE executed; last_analyze is fresh',
      'next-lesson': 'Prepared questions for Lesson 02'
    }
  }

  return {
    draft,
    submissions: [
      createSubmissionRecord(session, draft, checklist, new Date('2026-06-15T09:45:00.000Z'))
    ]
  }
}

test('buildMissionControlState creates next best action from ledger and homework signals', async () => {
  const {
    buildMissionControlState,
    createMissionControlReportMarkdown
  } = await import('../features/mission-control/mission-control-state.ts')
  const session = await loadSession()

  const state = buildMissionControlState(session, {
    catalogIsValid: true,
    sessionIsValid: true,
    checkedEvidence: ['partition-pruning'],
    notesByStage: {
      'partition-pruning': 'Ученик сам объяснил pruning.'
    },
    stageStatuses: {
      replay: 'done',
      'partition-pruning': 'done',
      statistics: 'risk'
    },
    actualMinutesByStage: {
      replay: 10,
      'partition-pruning': 18,
      statistics: 17
    },
    blockersByStage: {
      statistics: 'Нет before/after EXPLAIN.'
    },
    submissionState: await createCompleteSubmissionState(session)
  })

  assert.equal(state.title, 'Demo Student · greenplum-partitioning')
  assert.equal(state.phase, 'after')
  assert.equal(state.nextAction.targetSurface, 'review')
  assert.equal(state.nextAction.priority, 'critical')
  assert.ok(state.nextAction.description.includes('Нет before/after EXPLAIN.'))
  assert.equal(state.signals.find(signal => signal.code === 'assessment')?.value, '75%')
  assert.equal(state.signals.find(signal => signal.code === 'homework')?.value, '100%')
  assert.ok(state.focusQueue.some(action => action.title.includes('Statistics')))
  assert.ok(state.quickLinks.some(link => link.surface === 'post-lesson'))
  assert.ok(state.checklist.some(section => section.code === 'after'))

  const markdown = createMissionControlReportMarkdown(state)
  assert.match(markdown, /# Mentor Mission Control/)
  assert.match(markdown, /Next action: Закрыть ledger blocker/)
  assert.match(markdown, /Assessment: 75%/)
  assert.match(markdown, /Нет before\/after EXPLAIN\./)
})

test('buildMissionControlState keeps an empty live session actionable', async () => {
  const {
    buildMissionControlState
  } = await import('../features/mission-control/mission-control-state.ts')
  const state = buildMissionControlState(await loadSession(), {
    catalogIsValid: true,
    sessionIsValid: true
  })

  assert.equal(state.phase, 'live')
  assert.equal(state.nextAction.targetSurface, 'session')
  assert.equal(state.nextAction.priority, 'high')
  assert.equal(state.signals.find(signal => signal.code === 'evidence')?.value, '0%')
  assert.equal(state.signals.find(signal => signal.code === 'homework')?.status, 'open')
  assert.ok(state.checklist.some(section => section.code === 'live'))
  assert.ok(state.focusQueue.some(action => action.targetSurface === 'session'))
})
