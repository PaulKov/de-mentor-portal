import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadSample = async () => JSON.parse(await readFile('public/session.sample.json', 'utf-8'))

const createReadySubmissionState = async session => {
  const {
    buildSubmissionChecklist,
    createSubmissionRecord,
    createSubmissionStorageKey,
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
    key: createSubmissionStorageKey(session),
    value: {
      draft,
      submissions: [
        createSubmissionRecord(session, draft, checklist, new Date('2026-06-14T12:00:00.000Z'))
      ]
    }
  }
}

test('buildCohortDashboardState aggregates sessions, evidence and submissions', async () => {
  const {
    buildCohortDashboardState,
    createCohortReportMarkdown
  } = await import('../features/cohort-dashboard/cohort-dashboard-state.ts')
  const { createMentorStorageKey } = await import('../features/mentor-cockpit/mentor-cockpit-state.ts')
  const session = await loadSample()
  const secondSession = {
    ...session,
    student_name: 'Анна',
    created_at: '2026-06-15T09:00:00'
  }
  const readySubmission = await createReadySubmissionState(session)

  const state = buildCohortDashboardState(
    [
      { session, source: 'live:/api/session' },
      { session: secondSession, source: 'workspace:anna.json' }
    ],
    {
      mentorStates: {
        [createMentorStorageKey(session)]: {
          checkedEvidence: ['Partition pruning'],
          notesByStage: {},
          flagsByStage: {}
        }
      },
      submissionStates: {
        [readySubmission.key]: readySubmission.value
      }
    }
  )
  const demoCard = state.cards.find(card => card.studentName === 'Demo Student')
  const annaCard = state.cards.find(card => card.studentName === 'Анна')
  const partitionSkill = state.skillHeatmap.find(skill => skill.title === 'Partition pruning')

  assert.equal(state.metrics.learnerCount, 2)
  assert.equal(state.metrics.averageEvidencePercent, 25)
  assert.equal(state.metrics.readySubmissionCount, 1)
  assert.equal(state.metrics.highRiskCount, 2)
  assert.equal(demoCard?.evidencePercent, 50)
  assert.equal(demoCard?.submissionStatus, 'ready-for-review')
  assert.equal(demoCard?.nextLesson?.code, '02-greenplum-partitioning')
  assert.ok(demoCard?.risks.some(item => item.includes('Statistics after load')))
  assert.equal(annaCard?.learnerStatus, 'needs-attention')
  assert.equal(partitionSkill?.confirmedCount, 1)
  assert.equal(partitionSkill?.gapCount, 1)

  const markdown = createCohortReportMarkdown(state)
  assert.ok(markdown.includes('# Cohort Progress Dashboard'))
  assert.ok(markdown.includes('Demo Student · greenplum-partitioning'))
  assert.ok(markdown.includes('ready-for-review'))
  assert.ok(markdown.includes('Анна · greenplum-partitioning'))
})

test('buildCohortDashboardState filters visible cards by risk and submission readiness', async () => {
  const {
    buildCohortDashboardState
  } = await import('../features/cohort-dashboard/cohort-dashboard-state.ts')
  const { createMentorStorageKey } = await import('../features/mentor-cockpit/mentor-cockpit-state.ts')
  const session = await loadSample()
  const readySubmission = await createReadySubmissionState(session)

  const readyState = buildCohortDashboardState(
    [{ session, source: 'live:/api/session' }],
    {
      mentorStates: {
        [createMentorStorageKey(session)]: {
          checkedEvidence: ['Partition pruning'],
          notesByStage: {},
          flagsByStage: {}
        }
      },
      submissionStates: {
        [readySubmission.key]: readySubmission.value
      }
    },
    { status: 'ready-submissions' }
  )
  const riskState = buildCohortDashboardState(
    [{ session, source: 'live:/api/session' }],
    {},
    { status: 'risks' }
  )

  assert.equal(readyState.visibleCards.length, 1)
  assert.equal(readyState.visibleCards[0].submissionStatus, 'ready-for-review')
  assert.equal(riskState.visibleCards.length, 1)
  assert.equal(riskState.visibleCards[0].learnerStatus, 'needs-attention')
})

test('normalizeCohortFilters accepts only known filters', async () => {
  const {
    normalizeCohortFilters
  } = await import('../features/cohort-dashboard/cohort-dashboard-state.ts')

  assert.deepEqual(normalizeCohortFilters({ status: 'risks' }), { status: 'risks' })
  assert.deepEqual(normalizeCohortFilters({ status: 'broken' }), { status: 'all' })
  assert.deepEqual(normalizeCohortFilters(), { status: 'all' })
})
