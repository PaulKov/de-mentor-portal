import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadCatalogSample = async () =>
  JSON.parse(await readFile('public/catalog.sample.json', 'utf-8'))

const findTrack = (catalog, trackCode) =>
  catalog.tracks.find(track => track.code === trackCode)

const findLesson = (track, lessonCode) =>
  track.lessons.find(lesson => lesson.code === lessonCode)

test('buildLessonLauncherState creates default launch packet for ready lesson', async () => {
  const {
    buildLessonLauncherState
  } = await import('../features/lesson-launcher/lesson-launcher-state.ts')
  const catalog = await loadCatalogSample()
  const track = findTrack(catalog, 'greenplum')
  const lesson = findLesson(track, '01-greenplum-foundations')

  const state = buildLessonLauncherState(track, lesson)

  assert.equal(state.isAvailable, true)
  assert.equal(state.selectedRoute.code, 'simple')
  assert.equal(state.selectedPlatform.code, 'macos')
  assert.equal(state.studentName, 'Demo Student')
  assert.equal(state.outputDir, 'artifacts/sessions/lesson01-greenplum')
  assert.ok(state.sessionCommand.includes('--student "Demo Student"'))
  assert.ok(state.sessionCommand.includes('--route simple'))
  assert.deepEqual(
    state.commands.map(command => command.label),
    ['Create session', 'Mentor runbook', 'Student runbook', 'Self-check']
  )
})

test('buildLessonLauncherState applies student, route, platform and output preferences', async () => {
  const {
    buildLessonLauncherState
  } = await import('../features/lesson-launcher/lesson-launcher-state.ts')
  const catalog = await loadCatalogSample()
  const track = findTrack(catalog, 'greenplum')
  const lesson = findLesson(track, '01-greenplum-foundations')

  const state = buildLessonLauncherState(track, lesson, {
    studentName: 'Мария',
    routeCode: 'deep',
    platformCode: 'windows-wsl2',
    outputDir: 'artifacts/sessions/maria'
  })

  assert.equal(state.selectedRoute.code, 'deep')
  assert.equal(state.selectedPlatform.code, 'windows-wsl2')
  assert.equal(state.sessionCommand, 'python3 mentor-lab.py session greenplum start --student "Мария" --route deep --output artifacts/sessions/maria')
  assert.ok(state.commands.some(command => command.command === 'python3 mentor-lab.py runbook greenplum deep'))
  assert.ok(state.platformChecks.includes('wsl --status'))
})

test('buildLessonLauncherState reports unavailable launcher for planned lessons', async () => {
  const {
    buildLessonLauncherState
  } = await import('../features/lesson-launcher/lesson-launcher-state.ts')
  const catalog = await loadCatalogSample()
  const track = findTrack(catalog, 'spark')
  const lesson = findLesson(track, '01-spark-runtime-foundations')

  const state = buildLessonLauncherState(track, lesson)

  assert.equal(state.isAvailable, false)
  assert.equal(state.commands.length, 0)
  assert.equal(state.platformChecks.length, 0)
})

test('createLessonLauncherStorageKey is scoped to catalog lesson identity', async () => {
  const {
    createLessonLauncherStorageKey
  } = await import('../features/lesson-launcher/lesson-launcher-state.ts')
  const catalog = await loadCatalogSample()
  const track = findTrack(catalog, 'greenplum')
  const lesson = findLesson(track, '01-greenplum-foundations')

  assert.equal(
    createLessonLauncherStorageKey(track, lesson, catalog.generated_at),
    'lesson-launcher:2026-06-14T10:00:00:greenplum:01-greenplum-foundations'
  )
})
