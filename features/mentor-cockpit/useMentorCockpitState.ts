import { computed, onMounted, ref, watch, type Ref } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import { createSafeLocalStoragePort } from '~/shared/utils/local-storage'
import { buildMentorCockpitState, createMentorStorageKey } from './mentor-cockpit-state'

export interface MentorLocalState {
  checkedEvidence: string[]
  notesByStage: Record<string, string>
  flagsByStage: Record<string, string[]>
}

export const useMentorCockpitState = (session: Ref<AcademySession>) => {
  const selectedStageCode = ref(session.value.current_stage.code)
  const storageLoaded = ref(false)
  const localStateChangedBeforeLoad = ref(false)
  const localState = ref<MentorLocalState>(createEmptyLocalState())

  watch(
    () => session.value.current_stage.code,
    stageCode => {
      selectedStageCode.value = stageCode
    }
  )

  const cockpitState = computed(() =>
    buildMentorCockpitState(session.value, selectedStageCode.value)
  )
  const storageKey = computed(() => createMentorStorageKey(session.value))
  const checkedEvidence = computed(() => localState.value.checkedEvidence)
  const currentStageNote = computed(
    () => localState.value.notesByStage[cockpitState.value.selectedStage.code] ?? ''
  )

  const selectStage = (stageCode: string) => {
    selectedStageCode.value = stageCode
  }

  const toggleEvidence = (title: string, checked: boolean) => {
    const evidence = new Set(localState.value.checkedEvidence)
    if (checked) {
      evidence.add(title)
    } else {
      evidence.delete(title)
    }

    localState.value = {
      ...localState.value,
      checkedEvidence: Array.from(evidence)
    }
    if (!storageLoaded.value) {
      localStateChangedBeforeLoad.value = true
    }
  }

  const updateCurrentStageNote = (note: string) => {
    localState.value = {
      ...localState.value,
      notesByStage: {
        ...localState.value.notesByStage,
        [cockpitState.value.selectedStage.code]: note
      }
    }
    if (!storageLoaded.value) {
      localStateChangedBeforeLoad.value = true
    }
  }

  const loadLocalState = () => {
    const storagePort = createBrowserStoragePort()
    const savedState = storagePort.get<Partial<MentorLocalState>>(storageKey.value)
    if (localStateChangedBeforeLoad.value) {
      storagePort.set(storageKey.value, localState.value)
    } else {
      localState.value = normalizeLocalState(savedState)
    }
    storageLoaded.value = true
    localStateChangedBeforeLoad.value = false
  }

  onMounted(loadLocalState)

  watch(storageKey, () => {
    if (storageLoaded.value) {
      loadLocalState()
    }
  })

  watch(
    localState,
    value => {
      if (storageLoaded.value) {
        createBrowserStoragePort().set(storageKey.value, value)
      }
    },
    { deep: true }
  )

  return {
    checkedEvidence,
    cockpitState,
    currentStageNote,
    selectedStageCode,
    selectStage,
    toggleEvidence,
    updateCurrentStageNote
  }
}

const createEmptyLocalState = (): MentorLocalState => ({
  checkedEvidence: [],
  notesByStage: {},
  flagsByStage: {}
})

const normalizeLocalState = (state?: Partial<MentorLocalState> | null): MentorLocalState => ({
  checkedEvidence: Array.isArray(state?.checkedEvidence) ? state.checkedEvidence : [],
  notesByStage: isRecord(state?.notesByStage) ? state.notesByStage : {},
  flagsByStage: isRecord(state?.flagsByStage) ? state.flagsByStage : {}
})

const isRecord = (value: unknown): value is Record<string, never> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const createBrowserStoragePort = () =>
  createSafeLocalStoragePort(
    typeof window === 'undefined' ? undefined : window.localStorage
  )
