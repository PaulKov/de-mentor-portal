import { computed, onMounted, ref, watch, type Ref } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import { createSafeLocalStoragePort } from '~/shared/utils/local-storage'
import {
  createDashboardModeStorageKey,
  normalizeDashboardMode,
  type DashboardMode
} from './session-dashboard-mode'

export const useSessionDashboardMode = (session: Ref<AcademySession>) => {
  const mode = ref<DashboardMode>('mentor')
  const storageLoaded = ref(false)
  const storageKey = computed(() => createDashboardModeStorageKey(session.value))

  const selectMode = (nextMode: DashboardMode) => {
    mode.value = nextMode
  }

  const loadMode = () => {
    mode.value = normalizeDashboardMode(createBrowserStoragePort().get(storageKey.value))
    storageLoaded.value = true
  }

  onMounted(loadMode)

  watch(storageKey, () => {
    if (storageLoaded.value) {
      loadMode()
    }
  })

  watch(mode, value => {
    if (storageLoaded.value) {
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
