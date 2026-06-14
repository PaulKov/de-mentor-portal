import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadSample = async () => JSON.parse(await readFile('public/session.sample.json', 'utf-8'))

test('buildReviewCenterState scores evidence and derives handoff signals', async () => {
  const {
    buildReviewCenterState
  } = await import('../features/review-center/review-center-state.ts')
  const session = await loadSample()

  const state = buildReviewCenterState(session, {
    checkedEvidence: ['Partition pruning'],
    notesByStage: {
      'partition-pruning': 'Ученик сам показал pruning в EXPLAIN.'
    },
    flagsByStage: {}
  })

  assert.equal(state.title, 'Demo Student · greenplum-partitioning')
  assert.equal(state.evidenceScore.checked, 1)
  assert.equal(state.evidenceScore.total, 2)
  assert.equal(state.evidenceScore.percent, 50)
  assert.equal(state.stageSummaries.length, 3)
  assert.equal(
    state.stageSummaries.find(stage => stage.code === 'partition-pruning')?.reviewStatus,
    'reviewed'
  )
  assert.equal(
    state.stageSummaries.find(stage => stage.code === 'statistics')?.reviewStatus,
    'needs-review'
  )
  assert.ok(state.strengths.some(item => item.includes('Partition pruning')))
  assert.ok(state.risks.some(item => item.includes('Statistics after load')))
  assert.ok(state.recommendations.some(item => item.includes('ANALYZE')))
  assert.equal(state.nextLesson?.code, '02-greenplum-partitioning')
})

test('createReviewReportMarkdown and export payload are copy-ready', async () => {
  const {
    buildReviewCenterState,
    createReviewExportPayload,
    createReviewReportMarkdown
  } = await import('../features/review-center/review-center-state.ts')
  const session = await loadSample()
  const state = buildReviewCenterState(session, {
    checkedEvidence: ['Partition pruning'],
    notesByStage: {
      'partition-pruning': 'Ученик сам показал pruning в EXPLAIN.'
    },
    flagsByStage: {}
  })

  const markdown = createReviewReportMarkdown(state)
  const payload = createReviewExportPayload(state)

  assert.ok(markdown.includes('# Lesson Review: Demo Student · greenplum-partitioning'))
  assert.ok(markdown.includes('Evidence score: 1/2 (50%)'))
  assert.ok(markdown.includes('Ученик сам показал pruning в EXPLAIN.'))
  assert.ok(markdown.includes('Next lesson: Partitioning, statistics and incremental loads in MPP'))
  assert.equal(payload.student_name, 'Demo Student')
  assert.equal(payload.evidence_score.percent, 50)
  assert.equal(payload.stage_summaries.length, 3)
  assert.ok(payload.report_markdown.includes('Evidence score: 1/2 (50%)'))
})

test('normalizeReviewLocalState accepts partial and broken browser storage payloads', async () => {
  const {
    normalizeReviewLocalState
  } = await import('../features/review-center/review-center-state.ts')

  assert.deepEqual(
    normalizeReviewLocalState({
      checkedEvidence: ['Partition pruning'],
      notesByStage: { replay: 'ok' }
    }),
    {
      checkedEvidence: ['Partition pruning'],
      notesByStage: { replay: 'ok' },
      flagsByStage: {}
    }
  )
  assert.deepEqual(normalizeReviewLocalState({ checkedEvidence: 'broken' }), {
    checkedEvidence: [],
    notesByStage: {},
    flagsByStage: {}
  })
})
