import { computed, onMounted, ref, watch, type Ref } from 'vue'
import type { AcademyCatalog } from '~/core/catalog/domain/academy-catalog'
import { createSafeLocalStoragePort } from '~/shared/utils/local-storage'
import {
  buildLessonHubState,
  createLessonHubStorageKey,
  normalizeLessonHubRole,
  type LessonHubRole
} from './lesson-hub-state'

interface LessonHubLocalState {
  trackCode?: string
  lessonCode?: string
  role: LessonHubRole
}

export const useLessonHubState = (catalog: Ref<AcademyCatalog>) => {
  const localState = ref<LessonHubLocalState>({ role: 'mentor' })
  const storageLoaded = ref(false)
  const localStateChangedBeforeLoad = ref(false)
  const storageKey = computed(() => createLessonHubStorageKey(catalog.value))
  const hubState = computed(() => buildLessonHubState(catalog.value, localState.value))
  const flagEarlyChange = () => {
    if (!storageLoaded.value) {
      localStateChangedBeforeLoad.value = true
    }
  }

  const selectTrack = (trackCode: string) => {
    localState.value = {
      ...localState.value,
      trackCode,
      lessonCode: undefined
    }
    flagEarlyChange()
  }

  const selectLesson = (lessonCode: string) => {
    localState.value = {
      ...localState.value,
      lessonCode
    }
    flagEarlyChange()
  }

  const selectRole = (role: LessonHubRole) => {
    localState.value = {
      ...localState.value,
      role
    }
    flagEarlyChange()
  }

  const loadLocalState = () => {
    const storagePort = createBrowserStoragePort()
    if (localStateChangedBeforeLoad.value) {
      storagePort.set(storageKey.value, localState.value)
    } else {
      localState.value = normalizeLocalState(storagePort.get(storageKey.value))
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
    hubState,
    selectLesson,
    selectRole,
    selectTrack
  }
}

const normalizeLocalState = (value: unknown): LessonHubLocalState => {
  if (!isRecord(value)) {
    return { role: 'mentor' }
  }

  return {
    trackCode: typeof value.trackCode === 'string' ? value.trackCode : undefined,
    lessonCode: typeof value.lessonCode === 'string' ? value.lessonCode : undefined,
    role: normalizeLessonHubRole(value.role)
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const createBrowserStoragePort = () =>
  createSafeLocalStoragePort(
    typeof window === 'undefined' ? undefined : window.localStorage
  )
