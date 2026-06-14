import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const {
  buildMentorCockpitState,
  createMentorStorageKey
} = await import('../features/mentor-cockpit/mentor-cockpit-state.ts')
const { createSafeLocalStoragePort } = await import('../shared/utils/local-storage.ts')

const loadSample = async () => JSON.parse(await readFile('public/session.sample.json', 'utf-8'))

test('buildMentorCockpitState enriches the selected stage with control plane guide', async () => {
  const session = await loadSample()
  const state = buildMentorCockpitState(session, 'partition-pruning')

  assert.equal(state.selectedStage.code, 'partition-pruning')
  assert.equal(state.selectedGuide.question, 'Почему partition key не равен distribution key?')
  assert.equal(state.slideLabel, 'Slides 4-7')
  assert.ok(state.commands.includes('python3 mentor-lab.py runbook greenplum-partitioning simple'))
  assert.equal(state.googleSlidesUrl, session.control_plane.mentor_mode.google_slides)
  assert.equal(state.releaseStatus.controlPlane, 'ready')
})

test('buildMentorCockpitState falls back when control plane is absent', async () => {
  const session = await loadSample()
  delete session.control_plane
  const state = buildMentorCockpitState(session)

  assert.equal(state.selectedStage.code, session.current_stage.code)
  assert.equal(state.selectedGuide, undefined)
  assert.equal(state.slideLabel, 'Slides unavailable')
  assert.deepEqual(state.commands.slice(0, 2), [session.current_stage.command, session.commands[0]])
  assert.equal(state.releaseStatus.controlPlane, 'warning')
})

test('createMentorStorageKey isolates mentor state by session identity', async () => {
  const session = await loadSample()

  assert.equal(
    createMentorStorageKey(session),
    'mentor-cockpit:academy-session/v1:greenplum-partitioning:Demo Student:2026-06-14T10:00:00'
  )
})

test('createSafeLocalStoragePort reads and writes JSON safely', () => {
  const memory = new Map()
  const storage = {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
    removeItem: key => memory.delete(key)
  }
  const port = createSafeLocalStoragePort(storage)

  port.set('state', { checkedEvidence: ['partition-pruning'] })
  assert.deepEqual(port.get('state'), { checkedEvidence: ['partition-pruning'] })

  port.remove('state')
  assert.equal(port.get('state'), null)
})

test('createSafeLocalStoragePort degrades to no-op without storage', () => {
  const port = createSafeLocalStoragePort(undefined)

  port.set('state', { checkedEvidence: ['x'] })
  assert.equal(port.get('state'), null)
  port.remove('state')
})
