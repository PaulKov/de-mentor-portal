import { computed, onMounted, ref, watch, type Ref } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import { createSafeLocalStoragePort } from '~/shared/utils/local-storage'
import {
  createDashboardModeStorageKey,
  normalizeDashboardMode,
  type DashboardMode
} from './session-dashboard-mode'

export const useSessionDashboardMode = (session: Ref<AcademySession | null>) => {
  const mode = ref<DashboardMode>('mentor')
  const modeChangedBeforeLoad = ref(false)
  const storageLoaded = ref(false)
  const storageKey = computed(() =>
    session.value ? createDashboardModeStorageKey(session.value) : undefined
  )

  const selectMode = (nextMode: DashboardMode) => {
    mode.value = nextMode
    if (!storageLoaded.value) {
      modeChangedBeforeLoad.value = true
    }
  }

  const loadMode = () => {
    if (!storageKey.value) {
      return
    }

    const storagePort = createBrowserStoragePort()
    if (modeChangedBeforeLoad.value) {
      storagePort.set(storageKey.value, mode.value)
    } else {
      mode.value = normalizeDashboardMode(storagePort.get(storageKey.value))
    }
    storageLoaded.value = true
    modeChangedBeforeLoad.value = false
  }

  onMounted(loadMode)

  watch(storageKey, value => {
    if (value) {
      loadMode()
    }
  })

  watch(mode, value => {
    if (storageLoaded.value && storageKey.value) {
      createBrowserStoragePort().set(storageKey.value, value)
    }
  })

  return {
    mode,
    selectMode
  }
}

const createBrowserStoragePort = () =>
  createSafeLocalStoragePort(
    typeof window === 'undefined' ? undefined : window.localStorage
  )
