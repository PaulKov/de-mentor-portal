import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import { createSafeLocalStoragePort } from '~/shared/utils/local-storage'
import type { MentorCockpitState } from '~/features/mentor-cockpit/mentor-cockpit-state'
import {
  buildDeliveryControlRoomState,
  createDeliveryControlRoomStorageKey,
  normalizeDeliveryControlRoomLocalState,
  parseTimeboxSeconds,
  type DeliveryControlRoomLocalState,
  type DeliveryPanicMode
} from './delivery-control-room-state'

export const useDeliveryControlRoomState = (
  session: Ref<AcademySession>,
  cockpitState: Ref<MentorCockpitState>
) => {
  const nowMs = ref(Date.now())
  const startedAtMs = ref<number | null>(null)
  const localState = ref(createDefaultLocalState(cockpitState.value.selectedStage.code))
  const storageLoaded = ref(false)
  let intervalId: ReturnType<typeof window.setInterval> | undefined

  const plannedSeconds = computed(() =>
    parseTimeboxSeconds(cockpitState.value.selectedStage.timebox)
  )
  const storageKey = computed(() => createDeliveryControlRoomStorageKey(session.value))
  const effectiveLocalState = computed(() => createEffectiveLocalState(
    localState.value,
    startedAtMs.value,
    nowMs.value,
    cockpitState.value.selectedStage.code,
    plannedSeconds.value
  ))
  const controlRoomState = computed(() =>
    buildDeliveryControlRoomState(cockpitState.value, effectiveLocalState.value)
  )

  const startTimer = () => {
    localState.value = normalizeDeliveryControlRoomLocalState(
      { ...effectiveLocalState.value, timer: { ...effectiveLocalState.value.timer, status: 'running' } },
      cockpitState.value.selectedStage.code,
      plannedSeconds.value
    )
    startedAtMs.value = Date.now()
    startTicker()
  }

  const pauseTimer = () => {
    localState.value = {
      ...effectiveLocalState.value,
      timer: {
        ...effectiveLocalState.value.timer,
        status: 'paused'
      }
    }
    startedAtMs.value = null
    persist()
  }

  const resetTimer = () => {
    startedAtMs.value = null
    localState.value = createDefaultLocalState(cockpitState.value.selectedStage.code)
    persist()
  }

  const setPanicMode = (mode: DeliveryPanicMode) => {
    localState.value = {
      ...effectiveLocalState.value,
      panicMode: effectiveLocalState.value.panicMode === mode ? null : mode
    }
    persist()
  }

  const load = () => {
    const saved = createBrowserStoragePort()
      .get<Partial<DeliveryControlRoomLocalState>>(storageKey.value)
    localState.value = normalizeDeliveryControlRoomLocalState(
      saved,
      cockpitState.value.selectedStage.code,
      plannedSeconds.value
    )
    startedAtMs.value = localState.value.timer.status === 'running' ? Date.now() : null
    storageLoaded.value = true
  }

  const persist = () => {
    if (storageLoaded.value) {
      createBrowserStoragePort().set(storageKey.value, effectiveLocalState.value)
    }
  }

  const startTicker = () => {
    if (intervalId || typeof window === 'undefined') {
      return
    }

    intervalId = window.setInterval(() => {
      nowMs.value = Date.now()
    }, 1000)
  }

  onMounted(() => {
    load()
    startTicker()
  })

  onBeforeUnmount(() => {
    if (intervalId) {
      window.clearInterval(intervalId)
    }
  })

  watch(storageKey, load)
  watch(
    () => cockpitState.value.selectedStage.code,
    () => {
      localState.value = normalizeDeliveryControlRoomLocalState(
        effectiveLocalState.value,
        cockpitState.value.selectedStage.code,
        plannedSeconds.value
      )
      startedAtMs.value = null
      persist()
    }
  )

  return {
    controlRoomState,
    pauseTimer,
    resetTimer,
    setPanicMode,
    startTimer
  }
}

const createDefaultLocalState = (stageCode: string): DeliveryControlRoomLocalState => ({
  timer: {
    stageCode,
    status: 'idle',
    elapsedSeconds: 0
  },
  panicMode: null
})

const createEffectiveLocalState = (
  state: DeliveryControlRoomLocalState,
  startedAtMs: number | null,
  nowMs: number,
  selectedStageCode: string,
  plannedSeconds: number
): DeliveryControlRoomLocalState => {
  const elapsedSeconds = state.timer.status === 'running' && startedAtMs
    ? state.timer.elapsedSeconds + Math.floor((nowMs - startedAtMs) / 1000)
    : state.timer.elapsedSeconds

  return normalizeDeliveryControlRoomLocalState(
    { ...state, timer: { ...state.timer, elapsedSeconds } },
    selectedStageCode,
    plannedSeconds
  )
}

const createBrowserStoragePort = () =>
  createSafeLocalStoragePort(
    typeof window === 'undefined' ? undefined : window.localStorage
  )
