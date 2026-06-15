import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadSession = async () => JSON.parse(await readFile('public/session.sample.json', 'utf-8'))

test('buildDeliveryControlRoomState creates a focused stage delivery plan', async () => {
  const { buildMentorCockpitState } = await import('../features/mentor-cockpit/mentor-cockpit-state.ts')
  const {
    buildDeliveryControlRoomState
  } = await import('../features/delivery-control-room/delivery-control-room-state.ts')

  const cockpitState = buildMentorCockpitState(await loadSession(), 'partition-pruning')
  const state = buildDeliveryControlRoomState(cockpitState, {
    timer: {
      stageCode: 'partition-pruning',
      status: 'running',
      elapsedSeconds: 420
    },
    panicMode: 'lab-blocked'
  })

  assert.equal(state.stageIndexLabel, 'Stage 2 / 3')
  assert.equal(state.plannedSeconds, 900)
  assert.equal(state.elapsedSeconds, 420)
  assert.equal(state.remainingSeconds, 480)
  assert.equal(state.timerLabel, '07:00')
  assert.equal(state.remainingLabel, '08:00')
  assert.equal(state.progressPercent, 47)
  assert.equal(state.timerStatusLabel, 'running')
  assert.equal(state.focusCards.find(card => card.label === 'Что сказать')?.body, cockpitState.selectedGuide.mentor_script)
  assert.ok(state.focusCards.find(card => card.label === 'Что показать')?.body.includes('docker compose'))
  assert.ok(state.focusCards.find(card => card.label === 'Что спросить')?.body.includes('Почему partition key'))
  assert.ok(state.focusCards.find(card => card.label === 'Как проверить')?.body.includes('EXPLAIN pruning'))
  assert.equal(state.primaryCommand, 'python3 mentor-lab.py runbook greenplum-partitioning simple')
  assert.equal(state.evidenceAction?.label, 'Mark evidence: Partition pruning')
  assert.ok(state.activePanicGuide?.title.includes('Стенд не поднялся'))
})

test('normalizeDeliveryControlRoomLocalState clamps timer and panic state', async () => {
  const {
    normalizeDeliveryControlRoomLocalState
  } = await import('../features/delivery-control-room/delivery-control-room-state.ts')

  assert.deepEqual(
    normalizeDeliveryControlRoomLocalState(
      {
        timer: {
          stageCode: 'partition-pruning',
          status: 'broken',
          elapsedSeconds: 9999
        },
        panicMode: 'unknown-mode'
      },
      'partition-pruning',
      900
    ),
    {
      timer: {
        stageCode: 'partition-pruning',
        status: 'idle',
        elapsedSeconds: 900
      },
      panicMode: null
    }
  )
})

test('createDeliveryControlRoomStorageKey isolates state by session identity', async () => {
  const {
    createDeliveryControlRoomStorageKey
  } = await import('../features/delivery-control-room/delivery-control-room-state.ts')

  assert.equal(
    createDeliveryControlRoomStorageKey(await loadSession()),
    'delivery-control-room:academy-session/v1:greenplum-partitioning:Demo Student:2026-06-14T10:00:00'
  )
})
