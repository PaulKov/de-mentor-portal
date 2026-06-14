import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadSample = async () => JSON.parse(await readFile('public/session.sample.json', 'utf-8'))

test('buildStudentLaunchpadState exposes lesson resources and commands', async () => {
  const { buildStudentLaunchpadState } = await import('../features/student-launchpad/student-launchpad-state.ts')
  const state = buildStudentLaunchpadState(await loadSample(), 'macos')

  assert.equal(state.selectedPlatform.code, 'macos')
  assert.ok(state.resources.some(resource => resource.label === 'Student prep'))
  assert.ok(state.resources.some(resource => resource.path.endsWith('student-workbook.md')))
  assert.ok(state.resources.some(resource => resource.path.endsWith('homework.md')))
  assert.ok(state.artifacts.some(artifact => artifact.label === 'Google Slides'))
  assert.ok(state.selfCheckCommands.includes('python3 mentor-lab.py doctor'))
  assert.ok(state.portalCommands.some(command => command.includes('mentor-lab.py portal greenplum start')))
})

test('buildStudentLaunchpadState provides Windows WSL2 readiness steps', async () => {
  const { buildStudentLaunchpadState } = await import('../features/student-launchpad/student-launchpad-state.ts')
  const state = buildStudentLaunchpadState(await loadSample(), 'windows')

  assert.equal(state.selectedPlatform.label, 'Windows + WSL2')
  assert.ok(state.readinessSteps.some(step => step.command.includes('wsl --status')))
  assert.ok(state.readinessSteps.some(step => step.command.includes('docker compose version')))
})

test('student launchpad storage key is scoped to session identity', async () => {
  const { createStudentLaunchpadStorageKey } = await import('../features/student-launchpad/student-launchpad-state.ts')
  const session = await loadSample()

  assert.equal(
    createStudentLaunchpadStorageKey(session),
    'student-launchpad:academy-session/v1:greenplum-partitioning:Demo Student:2026-06-14T10:00:00'
  )
})
