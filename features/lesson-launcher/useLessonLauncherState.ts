import { computed, onMounted, ref, watch, type Ref } from 'vue'
import type { CatalogLesson, CatalogTrack } from '~/core/catalog/domain/academy-catalog'
import { createSafeLocalStoragePort } from '~/shared/utils/local-storage'
import {
  buildLessonLauncherState,
  createLessonLauncherStorageKey,
  type LessonLaunchPreferences
} from './lesson-launcher-state'

export const useLessonLauncherState = (
  track: Ref<CatalogTrack>,
  lesson: Ref<CatalogLesson>,
  catalogGeneratedAt: Ref<string>
) => {
  const preferences = ref<LessonLaunchPreferences>({})
  const storageLoaded = ref(false)
  const changedBeforeLoad = ref(false)
  const storageKey = computed(() =>
    createLessonLauncherStorageKey(track.value, lesson.value, catalogGeneratedAt.value)
  )
  const launcherState = computed(() =>
    buildLessonLauncherState(track.value, lesson.value, preferences.value)
  )
  const flagEarlyChange = () => {
    if (!storageLoaded.value) {
      changedBeforeLoad.value = true
    }
  }

  const updateStudentName = (studentName: string) => {
    preferences.value = { ...preferences.value, studentName }
    flagEarlyChange()
  }

  const updateOutputDir = (outputDir: string) => {
    preferences.value = { ...preferences.value, outputDir }
    flagEarlyChange()
  }

  const selectRoute = (routeCode: string) => {
    preferences.value = { ...preferences.value, routeCode }
    flagEarlyChange()
  }

  const selectPlatform = (platformCode: string) => {
    preferences.value = { ...preferences.value, platformCode }
    flagEarlyChange()
  }

  const loadPreferences = () => {
    const storagePort = createBrowserStoragePort()
    if (changedBeforeLoad.value) {
      storagePort.set(storageKey.value, preferences.value)
    } else {
      preferences.value = normalizePreferences(storagePort.get(storageKey.value))
    }
    storageLoaded.value = true
    changedBeforeLoad.value = false
  }

  onMounted(loadPreferences)

  watch(storageKey, () => {
    if (storageLoaded.value) {
      loadPreferences()
    }
  })

  watch(
    preferences,
    value => {
      if (storageLoaded.value) {
        createBrowserStoragePort().set(storageKey.value, value)
      }
    },
    { deep: true }
  )

  return {
    launcherState,
    selectPlatform,
    selectRoute,
    updateOutputDir,
    updateStudentName
  }
}

const normalizePreferences = (value: unknown): LessonLaunchPreferences => {
  if (!isRecord(value)) {
    return {}
  }

  return {
    studentName: stringOrUndefined(value.studentName),
    routeCode: stringOrUndefined(value.routeCode),
    platformCode: stringOrUndefined(value.platformCode),
    outputDir: stringOrUndefined(value.outputDir)
  }
}

const stringOrUndefined = (value: unknown) =>
  typeof value === 'string' ? value : undefined

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const createBrowserStoragePort = () =>
  createSafeLocalStoragePort(
    typeof window === 'undefined' ? undefined : window.localStorage
  )
