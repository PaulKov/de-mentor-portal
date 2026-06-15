import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadSample = async () => JSON.parse(await readFile('public/session.sample.json', 'utf-8'))

const createReadySubmissionState = async session => {
  const {
    buildSubmissionChecklist,
    createSubmissionRecord,
    updateSubmissionDraftEvidence
  } = await import('../features/submission-inbox/submission-inbox-state.ts')
  const checklist = buildSubmissionChecklist(session)
  const draft = checklist.reduce(
    (nextDraft, item) => updateSubmissionDraftEvidence(
      nextDraft,
      item.id,
      `${item.title}: accepted evidence`
    ),
    { evidenceByItem: {} }
  )

  return {
    draft,
    submissions: [
      createSubmissionRecord(session, draft, checklist, new Date('2026-06-15T09:30:00.000Z'))
    ]
  }
}

test('buildPostLessonPackState creates one mentor-ready packet from review, ledger and homework', async () => {
  const {
    buildPostLessonPackState,
    createPostLessonPackExport
  } = await import('../features/post-lesson-pack/post-lesson-pack-state.ts')
  const session = await loadSample()
  const submissionState = await createReadySubmissionState(session)

  const state = buildPostLessonPackState(session, {
    checkedEvidence: ['Partition pruning'],
    notesByStage: {
      'partition-pruning': 'Ученик сам показал pruning в EXPLAIN.'
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
    },
    submissionState
  })
  const exportPayload = createPostLessonPackExport(state)

  assert.equal(state.title, 'Demo Student · greenplum-partitioning')
  assert.equal(state.readiness, 'needs-attention')
  assert.equal(state.metrics.evidencePercent, 50)
  assert.equal(state.metrics.homeworkPercent, 100)
  assert.equal(state.metrics.ledgerDeltaMinutes, 3)
  assert.equal(state.sections.map(section => section.code).join(','), [
    'lesson-summary',
    'learner-handoff',
    'homework',
    'next-lesson',
    'mentor-follow-up'
  ].join(','))
  assert.ok(state.unresolvedBlockers.some(item => item.includes('Нет before/after EXPLAIN.')))
  assert.ok(state.unresolvedBlockers.some(item => item.includes('Statistics after load')))
  assert.ok(state.packetMarkdown.includes('# Post-Lesson Pack: Demo Student · greenplum-partitioning'))
  assert.ok(state.packetMarkdown.includes('## Lesson Summary'))
  assert.ok(state.packetMarkdown.includes('Ledger: 1/3 done, 1 risk, +3 min'))
  assert.ok(state.packetMarkdown.includes('Homework: ready-for-review, 4/4 (100%)'))
  assert.ok(state.packetMarkdown.includes('Next lesson: Partitioning, statistics and incremental loads in MPP'))
  assert.equal(exportPayload.readiness, 'needs-attention')
  assert.equal(exportPayload.sections.length, 5)
  assert.ok(exportPayload.packet_markdown.includes('Нет before/after EXPLAIN.'))
})

test('buildPostLessonPackState marks packet ready when evidence and homework are complete', async () => {
  const {
    buildPostLessonPackState
  } = await import('../features/post-lesson-pack/post-lesson-pack-state.ts')
  const session = await loadSample()
  const submissionState = await createReadySubmissionState(session)

  const state = buildPostLessonPackState(session, {
    checkedEvidence: ['Partition pruning', 'Statistics after load'],
    stageStatuses: {
      replay: 'done',
      'partition-pruning': 'done',
      statistics: 'done'
    },
    submissionState
  })

  assert.equal(state.readiness, 'ready-to-send')
  assert.deepEqual(state.unresolvedBlockers, [])
  assert.ok(state.actionItems.some(item => item.includes('Отправить post-lesson pack ученику')))
})
