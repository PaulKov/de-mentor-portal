import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadCatalog = async () => JSON.parse(await readFile('public/catalog.sample.json', 'utf-8'))

test('buildLessonHubState selects requested track, lesson and role', async () => {
  const {
    buildLessonHubState
  } = await import('../features/lesson-hub/lesson-hub-state.ts')
  const state = buildLessonHubState(await loadCatalog(), {
    trackCode: 'spark',
    role: 'student'
  })

  assert.equal(state.selectedTrack.code, 'spark')
  assert.equal(state.selectedRole, 'student')
  assert.equal(state.selectedLesson.code, '01-spark-runtime-foundations')
  assert.equal(state.selectedCommands[0], 'python3 mentor-lab.py runbook spark intro student')
  assert.equal(state.trackSummaries.length >= 5, true)
})

test('buildLessonHubState falls back to default track and first lesson', async () => {
  const {
    buildLessonHubState
  } = await import('../features/lesson-hub/lesson-hub-state.ts')
  const state = buildLessonHubState(await loadCatalog(), {
    trackCode: 'unknown',
    lessonCode: 'missing',
    role: 'broken'
  })

  assert.equal(state.selectedTrack.code, 'greenplum')
  assert.equal(state.selectedLesson.code, '01-greenplum-foundations')
  assert.equal(state.selectedRole, 'mentor')
  assert.ok(state.selectedCommands.includes('python3 mentor-lab.py runbook greenplum simple'))
})

test('createLessonHubStorageKey is scoped to catalog identity', async () => {
  const {
    createLessonHubStorageKey
  } = await import('../features/lesson-hub/lesson-hub-state.ts')
  const catalog = await loadCatalog()

  assert.equal(
    createLessonHubStorageKey(catalog),
    'academy-lesson-hub:academy-catalog/v1:2026-06-14T10:00:00'
  )
})
