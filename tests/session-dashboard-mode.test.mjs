import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadSample = async () => JSON.parse(await readFile('public/session.sample.json', 'utf-8'))

test('createDashboardModeStorageKey isolates mode by session identity', async () => {
  const { createDashboardModeStorageKey } = await import('../features/session-dashboard/session-dashboard-mode.ts')
  const session = await loadSample()

  assert.equal(
    createDashboardModeStorageKey(session),
    'session-dashboard-mode:academy-session/v1:greenplum-partitioning:Demo Student:2026-06-14T10:00:00'
  )
})

test('normalizeDashboardMode accepts only known modes', async () => {
  const { normalizeDashboardMode } = await import('../features/session-dashboard/session-dashboard-mode.ts')

  assert.equal(normalizeDashboardMode('student'), 'student')
  assert.equal(normalizeDashboardMode('mentor'), 'mentor')
  assert.equal(normalizeDashboardMode('broken'), 'mentor')
  assert.equal(normalizeDashboardMode(undefined), 'mentor')
})
