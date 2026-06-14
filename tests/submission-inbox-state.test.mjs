import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadSample = async () => JSON.parse(await readFile('public/session.sample.json', 'utf-8'))

test('buildSubmissionInboxState derives a student submission checklist from the session', async () => {
  const {
    buildSubmissionInboxState
  } = await import('../features/submission-inbox/submission-inbox-state.ts')
  const session = await loadSample()

  const state = buildSubmissionInboxState(session)

  assert.equal(state.title, 'Demo Student · greenplum-partitioning')
  assert.equal(state.checklist.length, 4)
  assert.equal(state.draftScore.completed, 0)
  assert.equal(state.draftScore.total, 4)
  assert.equal(state.draftScore.percent, 0)
  assert.equal(state.draftStatus, 'needs-evidence')
  assert.ok(state.checklist.some(item => item.id === 'self-check'))
  assert.ok(state.checklist.some(item => item.id === 'skill:partition-pruning'))
  assert.ok(state.checklist.some(item => item.id === 'skill:statistics'))
  assert.ok(state.checklist.some(item => item.id === 'next-lesson'))
  assert.ok(state.draftRisks.some(item => item.includes('python3 mentor-lab.py doctor')))
  assert.equal(state.submissions.length, 0)
})

test('createSubmissionRecord scores complete evidence and builds mentor-ready markdown', async () => {
  const {
    buildSubmissionInboxState,
    createSubmissionRecord,
    createSubmissionReportMarkdown,
    updateSubmissionDraftEvidence
  } = await import('../features/submission-inbox/submission-inbox-state.ts')
  const session = await loadSample()
  const emptyState = buildSubmissionInboxState(session)

  const filledDraft = emptyState.checklist.reduce(
    (draft, item) => updateSubmissionDraftEvidence(
      draft,
      item.id,
      `${item.title}: evidence attached with EXPLAIN and command output.`
    ),
    emptyState.draft
  )
  const record = createSubmissionRecord(session, filledDraft, emptyState.checklist)
  const markdown = createSubmissionReportMarkdown(record)

  assert.equal(record.status, 'ready-for-review')
  assert.equal(record.score.completed, 4)
  assert.equal(record.score.percent, 100)
  assert.ok(record.id.includes('greenplum-partitioning'))
  assert.ok(record.evidence.some(item => item.id === 'skill:partition-pruning'))
  assert.ok(markdown.includes('# Homework Submission: Demo Student · greenplum-partitioning'))
  assert.ok(markdown.includes('Completeness: 4/4 (100%)'))
  assert.ok(markdown.includes('Next lesson: Partitioning, statistics and incremental loads in MPP'))
})

test('normalizeSubmissionLocalState accepts partial and broken browser storage payloads', async () => {
  const {
    normalizeSubmissionLocalState
  } = await import('../features/submission-inbox/submission-inbox-state.ts')

  assert.deepEqual(
    normalizeSubmissionLocalState({
      draft: {
        evidenceByItem: {
          'skill:partition-pruning': 'EXPLAIN shows pruning'
        }
      },
      submissions: [
        {
          id: 'ok',
          sessionKey: 'session',
          studentName: 'Demo Student',
          labName: 'greenplum',
          createdAt: '2026-06-14T10:10:00.000Z',
          status: 'ready-for-review',
          score: { completed: 1, total: 1, percent: 100 },
          evidence: []
        }
      ]
    }),
    {
      draft: {
        evidenceByItem: {
          'skill:partition-pruning': 'EXPLAIN shows pruning'
        }
      },
      submissions: [
        {
          id: 'ok',
          sessionKey: 'session',
          studentName: 'Demo Student',
          labName: 'greenplum',
          createdAt: '2026-06-14T10:10:00.000Z',
          status: 'ready-for-review',
          score: { completed: 1, total: 1, percent: 100 },
          evidence: []
        }
      ]
    }
  )

  assert.deepEqual(normalizeSubmissionLocalState({ draft: 'broken', submissions: 'broken' }), {
    draft: {
      evidenceByItem: {}
    },
    submissions: []
  })
})
