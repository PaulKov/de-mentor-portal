import { computed, onMounted, ref, watch, type Ref } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import { createSafeLocalStoragePort } from '~/shared/utils/local-storage'
import {
  buildEvidenceLedgerState,
  createEvidenceLedgerStorageKey,
  normalizeEvidenceLedgerLocalState,
  type EvidenceLedgerLocalState,
  type EvidenceLedgerStageStatus
} from './evidence-ledger-state'

export const useEvidenceLedgerState = (
  session: Ref<AcademySession>,
  checkedEvidence: Ref<string[]>,
  notesByStage: Ref<Record<string, string>>
) => {
  const storageLoaded = ref(false)
  const localStateChangedBeforeLoad = ref(false)
  const localState = ref<EvidenceLedgerLocalState>(createEmptyLocalState())
  const storageKey = computed(() => createEvidenceLedgerStorageKey(session.value))
  const ledgerState = computed(() =>
    buildEvidenceLedgerState(session.value, {
      ...localState.value,
      checkedEvidence: checkedEvidence.value,
      notesByStage: notesByStage.value
    })
  )

  const setStageStatus = (stageCode: string, status: EvidenceLedgerStageStatus) => {
    localState.value = {
      ...localState.value,
      stageStatuses: {
        ...localState.value.stageStatuses,
        [stageCode]: status
      }
    }
    markChangedBeforeLoad()
  }

  const setActualMinutes = (stageCode: string, minutes: number) => {
    localState.value = normalizeEvidenceLedgerLocalState({
      ...localState.value,
      actualMinutesByStage: {
        ...localState.value.actualMinutesByStage,
        [stageCode]: minutes
      }
    })
    markChangedBeforeLoad()
  }

  const setBlocker = (stageCode: string, blocker: string) => {
    localState.value = {
      ...localState.value,
      blockersByStage: {
        ...localState.value.blockersByStage,
        [stageCode]: blocker
      }
    }
    markChangedBeforeLoad()
  }

  const resetStageLedger = (stageCode: string) => {
    const { [stageCode]: _status, ...stageStatuses } = localState.value.stageStatuses
    const { [stageCode]: _minutes, ...actualMinutesByStage } = localState.value.actualMinutesByStage
    const { [stageCode]: _blocker, ...blockersByStage } = localState.value.blockersByStage
    localState.value = {
      stageStatuses,
      actualMinutesByStage,
      blockersByStage
    }
    markChangedBeforeLoad()
  }

  const loadLocalState = () => {
    const storagePort = createBrowserStoragePort()
    const savedState = storagePort.get<EvidenceLedgerLocalState>(storageKey.value)
    if (localStateChangedBeforeLoad.value) {
      storagePort.set(storageKey.value, localState.value)
    } else {
      localState.value = normalizeEvidenceLedgerLocalState(savedState)
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

  const markChangedBeforeLoad = () => {
    if (!storageLoaded.value) {
      localStateChangedBeforeLoad.value = true
    }
  }

  return {
    ledgerState,
    resetStageLedger,
    setActualMinutes,
    setBlocker,
    setStageStatus
  }
}

const createEmptyLocalState = (): EvidenceLedgerLocalState => ({
  stageStatuses: {},
  actualMinutesByStage: {},
  blockersByStage: {}
})

const createBrowserStoragePort = () =>
  createSafeLocalStoragePort(
    typeof window === 'undefined' ? undefined : window.localStorage
  )
