import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadCatalog = async () => JSON.parse(await readFile('public/catalog.sample.json', 'utf-8'))

test('buildLessonAuthoringState creates a ready draft from sample catalog', async () => {
  const { buildLessonAuthoringState } =
    await import('../features/lesson-authoring/lesson-authoring-state.ts')
  const state = buildLessonAuthoringState(await loadCatalog(), {
    trackCode: 'greenplum',
    lessonCode: '01-greenplum-foundations'
  })

  assert.equal(state.selectedTrack.code, 'greenplum')
  assert.equal(state.selectedLesson.code, '01-greenplum-foundations')
  assert.equal(state.stageRows.length > 0, true)
  assert.equal(state.qualityChecks.some(check => check.severity === 'blocker'), false)
  assert.equal(state.readinessScore >= 85, true)
  assert.match(state.exports.catalogPatchMarkdown, /Greenplum Foundations/)
  assert.match(state.exports.sessionSeedJson, /academy-session\/v1/)
})

test('buildLessonAuthoringState explains blockers for an incomplete draft', async () => {
  const { buildLessonAuthoringState } =
    await import('../features/lesson-authoring/lesson-authoring-state.ts')
  const state = buildLessonAuthoringState(await loadCatalog(), {
    trackCode: 'greenplum',
    lessonCode: '01-greenplum-foundations',
    draft: {
      totalMinutes: 0,
      stages: [
        {
          code: 'empty',
          title: 'Empty stage',
          durationMinutes: 0,
          mentorAction: '',
          studentAction: '',
          command: '',
          question: '',
          evidence: ''
        }
      ],
      homeworkTasks: []
    }
  })

  assert.equal(state.readiness, 'blocked')
  assert.equal(state.qualityChecks.filter(check => check.severity === 'blocker').length >= 4, true)
  assert.ok(state.qualityChecks.some(check => check.title === 'Stage без mentor action'))
  assert.match(state.exports.qualityReportMarkdown, /Blockers/)
})

test('normalizeLessonAuthoringDraft rejects broken browser payloads', async () => {
  const { normalizeLessonAuthoringDraft } =
    await import('../features/lesson-authoring/lesson-authoring-state.ts')

  assert.deepEqual(normalizeLessonAuthoringDraft(null), {})
  assert.deepEqual(normalizeLessonAuthoringDraft({ stages: 'bad', totalMinutes: -10 }), {})
  assert.deepEqual(
    normalizeLessonAuthoringDraft({
      totalMinutes: 45,
      homeworkTasks: ['  demo  ', ''],
      stages: [
        {
          code: 's1',
          title: 'Stage',
          durationMinutes: 10,
          mentorAction: 'Show',
          studentAction: 'Repeat',
          command: 'select 1',
          question: 'Why?',
          evidence: 'Answer'
        }
      ]
    }),
    {
      totalMinutes: 45,
      homeworkTasks: ['demo'],
      stages: [
        {
          code: 's1',
          title: 'Stage',
          durationMinutes: 10,
          mentorAction: 'Show',
          studentAction: 'Repeat',
          command: 'select 1',
          question: 'Why?',
          evidence: 'Answer'
        }
      ]
    }
  )
})
