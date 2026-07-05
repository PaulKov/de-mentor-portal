import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadSample = async () => JSON.parse(await readFile('public/session.sample.json', 'utf-8'))

test('buildHomeworkReviewStudioState exposes Lesson 01 guided review data', async () => {
  const {
    buildHomeworkReviewStudioState
  } = await import('../features/homework-review/homework-review-state.ts')
  const session = await loadSample()

  const state = buildHomeworkReviewStudioState(session)

  assert.equal(state.available, true)
  assert.equal(state.title, 'Lesson 01 Homework Walkthrough')
  assert.equal(state.statusLabel, 'Не сдано')
  assert.equal(state.scoreLabel, '0/100')
  assert.equal(state.acceptanceLabel, 'Нужен разбор')
  assert.equal(state.rubricItems.length, 8)
  assert.equal(state.liveChecklist.length, 5)
  assert.equal(state.sqlSnippets.length, 4)
  assert.equal(state.selectedRubric.code, 'fact-dimension-modeling')
  assert.ok(state.selectedRubric.mentor_prompt.includes('facts'))
  assert.ok(state.selectedRubric.expected_evidence.includes('grain'))
  assert.ok(state.nextPlanMarkdown.includes('lesson-02'))
  assert.ok(state.nextPlanMarkdown.includes('Partitioning'))
})

test('buildHomeworkReviewStudioState selects the requested rubric item and tracks progress', async () => {
  const {
    buildHomeworkReviewStudioState
  } = await import('../features/homework-review/homework-review-state.ts')
  const session = await loadSample()

  const state = buildHomeworkReviewStudioState(session, {
    checkedRubric: ['fact-dimension-modeling', 'storage-design'],
    checkedChecklist: ['context'],
    notes: 'Ученик повторил команды вместе с ментором.',
    conclusionText: 'Закрываем пробелы перед Lesson 02.',
    selectedRubricCode: 'distribution-design',
    flags: {
      needs_follow_up: true,
      ready_for_lesson_02: false,
      next_plan_sent: false
    }
  })

  assert.equal(state.selectedRubric.code, 'distribution-design')
  assert.equal(state.rubricProgress.checked, 2)
  assert.equal(state.rubricProgress.total, 8)
  assert.equal(state.checklistProgress.checked, 1)
  assert.equal(state.localState.notes, 'Ученик повторил команды вместе с ментором.')
  assert.equal(state.localState.flags.needs_follow_up, true)
})

test('normalizeHomeworkReviewLocalState filters stale local storage by current review payload', async () => {
  const {
    normalizeHomeworkReviewLocalState
  } = await import('../features/homework-review/homework-review-state.ts')
  const session = await loadSample()
  const review = session.homework_review

  assert.deepEqual(
    normalizeHomeworkReviewLocalState(
      {
        checkedRubric: ['fact-dimension-modeling', 'stale'],
        checkedChecklist: ['context', 'stale'],
        notes: 'ok',
        conclusionText: 'done',
        selectedRubricCode: 'stale',
        flags: {
          needs_follow_up: true,
          ready_for_lesson_02: true,
          next_plan_sent: true
        }
      },
      review
    ),
    {
      checkedRubric: ['fact-dimension-modeling'],
      checkedChecklist: ['context'],
      notes: 'ok',
      conclusionText: 'done',
      selectedRubricCode: undefined,
      flags: {
        needs_follow_up: true,
        ready_for_lesson_02: true,
        next_plan_sent: true
      }
    }
  )

  assert.deepEqual(normalizeHomeworkReviewLocalState({ checkedRubric: 'broken' }, review), {
    checkedRubric: [],
    checkedChecklist: [],
    notes: '',
    conclusionText: '',
    selectedRubricCode: undefined,
    flags: {
      needs_follow_up: false,
      ready_for_lesson_02: false,
      next_plan_sent: false
    }
  })
})

test('createHomeworkReviewStorageKey isolates review studio local state by session identity', async () => {
  const {
    createHomeworkReviewStorageKey
  } = await import('../features/homework-review/homework-review-state.ts')
  const session = await loadSample()

  assert.equal(
    createHomeworkReviewStorageKey(session),
    'homework-review:academy-session/v1:greenplum-partitioning:Demo Student:2026-06-14T10:00:00'
  )
})

test('buildHomeworkReviewStudioState stays unavailable when payload is absent', async () => {
  const {
    buildHomeworkReviewStudioState
  } = await import('../features/homework-review/homework-review-state.ts')
  const session = await loadSample()
  delete session.homework_review

  assert.deepEqual(buildHomeworkReviewStudioState(session), {
    available: false,
    reason: 'homework_review missing'
  })
})
