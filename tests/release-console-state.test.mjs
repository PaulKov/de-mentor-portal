import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadCatalog = async () => JSON.parse(await readFile('public/catalog.sample.json', 'utf-8'))
const loadSession = async () => JSON.parse(await readFile('public/session.sample.json', 'utf-8'))

test('buildReleaseConsoleState creates go/no-go summary for the current lesson', async () => {
  const {
    buildReleaseConsoleState
  } = await import('../features/release-console/release-console-state.ts')

  const state = buildReleaseConsoleState(await loadCatalog(), await loadSession())

  assert.equal(state.selectedLesson.lessonCode, '02-greenplum-partitioning')
  assert.equal(state.selectedLesson.goNoGo, 'go')
  assert.equal(state.summary.lessonCount >= 5, true)
  assert.equal(state.summary.goCount >= 1, true)
  assert.equal(state.summary.blockedCount >= 1, true)
  assert.ok(state.selectedLesson.checks.some(check => check.label === 'Google Slides / deck'))
  assert.ok(state.selectedLesson.checks.some(check => check.label === 'Workbook'))
  assert.ok(state.selectedLesson.checks.some(check => check.label === 'Homework'))
  assert.ok(state.selectedLesson.checks.some(check => check.label === 'SQL lab'))
  assert.ok(state.selectedLesson.checks.some(check => check.label === 'Runbook commands'))
  assert.ok(state.selectedLesson.checks.some(check => check.label === 'Launcher'))
  assert.ok(state.selectedLesson.commands.includes('python3 mentor-lab.py lesson-release greenplum-partitioning verify'))
  assert.ok(state.selectedLesson.artifacts.some(artifact => artifact.path.includes('docs.google.com/presentation')))
  assert.match(state.reportMarkdown, /Go\/no-go: go/)
  assert.match(state.reportMarkdown, /python3 mentor-lab.py lesson-release greenplum-partitioning verify/)
})

test('buildReleaseConsoleState highlights blocked lessons and exact risks', async () => {
  const {
    buildReleaseConsoleState
  } = await import('../features/release-console/release-console-state.ts')
  const catalog = await loadCatalog()

  const state = buildReleaseConsoleState(catalog, null, {
    trackCode: 'clickhouse',
    lessonCode: '01-clickhouse-foundations'
  })

  assert.equal(state.selectedTrack.code, 'clickhouse')
  assert.equal(state.selectedLesson.goNoGo, 'blocked')
  assert.ok(state.selectedLesson.risks.some(risk => risk.includes('Lesson status is planned')))
  assert.ok(state.selectedLesson.risks.some(risk => risk.includes('Google Slides / deck')))
  assert.ok(state.selectedLesson.risks.some(risk => risk.includes('Runbook commands')))
  assert.equal(state.selectedLesson.readinessPercent < 60, true)
})

test('normalizeReleasePreferences keeps only existing track and lesson choices', async () => {
  const {
    buildReleaseConsoleState,
    normalizeReleasePreferences
  } = await import('../features/release-console/release-console-state.ts')
  const catalog = await loadCatalog()

  assert.deepEqual(
    normalizeReleasePreferences(catalog, { trackCode: 'spark', lessonCode: 'broken' }),
    { trackCode: 'spark', lessonCode: '01-spark-runtime-foundations' }
  )

  const state = buildReleaseConsoleState(catalog, null, {
    trackCode: 'missing',
    lessonCode: 'missing'
  })

  assert.equal(state.selectedTrack.code, 'greenplum')
  assert.equal(state.selectedLesson.lessonCode, '01-greenplum-foundations')
})
