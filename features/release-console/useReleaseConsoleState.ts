import { computed, onMounted, ref, watch, type Ref } from 'vue'
import type { AcademyCatalog } from '~/core/catalog/domain/academy-catalog'
import type { AcademySession } from '~/core/session/domain/academy-session'
import { createSafeLocalStoragePort } from '~/shared/utils/local-storage'
import {
  buildReleaseConsoleState,
  createReleaseConsoleStorageKey,
  normalizeReleasePreferences,
  type ReleasePreferences
} from './release-console-state'

interface ReleaseConsoleStore {
  preferences?: ReleasePreferences
}

export const useReleaseConsoleState = (
  catalog: Ref<AcademyCatalog>,
  session: Ref<AcademySession | null>
) => {
  const preferences = ref<ReleasePreferences>({})
  const releaseState = computed(() =>
    buildReleaseConsoleState(catalog.value, session.value, preferences.value)
  )

  const hydrate = () => {
    preferences.value = readPreferences(catalog.value)
  }

  const selectTrack = (trackCode: string) => {
    preferences.value = normalizeReleasePreferences(catalog.value, { trackCode })
    persistPreferences(catalog.value, preferences.value)
  }

  const selectLesson = (trackCode: string, lessonCode: string) => {
    preferences.value = normalizeReleasePreferences(catalog.value, { trackCode, lessonCode })
    persistPreferences(catalog.value, preferences.value)
  }

  onMounted(hydrate)
  watch(catalog, hydrate)
  watch(session, () => {
    if (!preferences.value.trackCode && !preferences.value.lessonCode) {
      hydrate()
    }
  })

  return {
    hydrate,
    releaseState,
    selectLesson,
    selectTrack
  }
}

const readPreferences = (catalog: AcademyCatalog): ReleasePreferences => {
  const store = createBrowserStoragePort().get(createReleaseConsoleStorageKey(catalog)) as ReleaseConsoleStore | null

  return store?.preferences ? normalizeReleasePreferences(catalog, store.preferences) : {}
}

const persistPreferences = (catalog: AcademyCatalog, preferences: ReleasePreferences) => {
  createBrowserStoragePort().set(createReleaseConsoleStorageKey(catalog), { preferences })
}

const createBrowserStoragePort = () =>
  createSafeLocalStoragePort(
    typeof window === 'undefined' ? undefined : window.localStorage
  )
