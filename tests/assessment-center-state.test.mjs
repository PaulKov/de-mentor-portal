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
      createSubmissionRecord(session, draft, checklist, new Date('2026-06-15T08:00:00.000Z'))
    ]
  }
}

test('buildAssessmentCenterState grades skills from mentor, ledger and homework evidence', async () => {
  const {
    buildAssessmentCenterState,
    createAssessmentExport,
    createAssessmentReportMarkdown
  } = await import('../features/assessment-center/assessment-center-state.ts')
  const session = await loadSession()

  const state = buildAssessmentCenterState(session, {
    checkedEvidence: ['partition-pruning'],
    notesByStage: {
      'partition-pruning': 'Ученик сам объяснил pruning и retention.'
    },
    stageStatuses: {
      'partition-pruning': 'done',
      statistics: 'risk'
    },
    actualMinutesByStage: {
      'partition-pruning': 18,
      statistics: 17
    },
    blockersByStage: {
      statistics: 'Нет before/after EXPLAIN.'
    },
    submissionState: await createCompleteSubmissionState(session)
  })

  assert.equal(state.title, 'Demo Student · greenplum-partitioning')
  assert.equal(state.metrics.skillCount, 2)
  assert.equal(state.metrics.masteryPercent, 75)
  assert.equal(state.metrics.readySkillCount, 1)
  assert.equal(state.metrics.blockedSkillCount, 1)
  assert.equal(state.metrics.nextLessonFocusCount, 1)

  const pruning = state.skills.find(skill => skill.code === 'partition-pruning')
  const statistics = state.skills.find(skill => skill.code === 'statistics')
  assert.equal(pruning?.level, 'can-apply')
  assert.equal(statistics?.level, 'can-repeat')
  assert.equal(pruning?.evidenceSources.join(','), 'mentor,ledger,homework')
  assert.equal(statistics?.blocker, 'Нет before/after EXPLAIN.')
  assert.ok(statistics?.nextAction.includes('короткий mini-lab'))
  assert.ok(state.learningPath.some(item => item.title.includes('Homework')))
  assert.ok(state.learningPath.some(item => item.title.includes('Lesson 02')))

  const markdown = createAssessmentReportMarkdown(state)
  assert.match(markdown, /# Skill Assessment: Demo Student · greenplum-partitioning/)
  assert.match(markdown, /Mastery: 75%/)
  assert.match(markdown, /Partition pruning: can-apply/)
  assert.match(markdown, /Statistics after load: can-repeat/)
  assert.match(markdown, /Нет before\/after EXPLAIN\./)
  assert.match(markdown, /Next lesson: Partitioning, statistics and incremental loads in MPP/)

  const exported = createAssessmentExport(state)
  assert.equal(exported.mastery_percent, 75)
  assert.equal(exported.skills.length, 2)
  assert.match(exported.report_markdown, /Skill Assessment/)
})

test('buildAssessmentCenterState keeps an empty assessment actionable', async () => {
  const {
    buildAssessmentCenterState
  } = await import('../features/assessment-center/assessment-center-state.ts')
  const session = await loadSession()
  const state = buildAssessmentCenterState(session)

  assert.equal(state.metrics.masteryPercent, 0)
  assert.equal(state.metrics.readySkillCount, 0)
  assert.equal(state.metrics.nextLessonFocusCount, 2)
  assert.deepEqual(state.skills.map(skill => skill.level), ['not-started', 'not-started'])
  assert.ok(state.skills.every(skill => skill.nextAction.includes('Закрыть evidence')))
  assert.ok(state.recommendations.some(item => item.includes('Начать с evidence')))
})
