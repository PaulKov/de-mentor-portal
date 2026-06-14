import { computed, onMounted, ref, watch, type Ref } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import { createSafeLocalStoragePort } from '~/shared/utils/local-storage'
import {
  buildStudentLaunchpadState,
  createStudentLaunchpadStorageKey,
  normalizeStudentPlatform,
  type StudentPlatformCode
} from './student-launchpad-state'

export const useStudentLaunchpadState = (session: Ref<AcademySession>) => {
  const selectedPlatformCode = ref<StudentPlatformCode>('macos')
  const storageLoaded = ref(false)
  const storageKey = computed(() => createStudentLaunchpadStorageKey(session.value))
  const launchpadState = computed(() =>
    buildStudentLaunchpadState(session.value, selectedPlatformCode.value)
  )

  const selectPlatform = (platformCode: StudentPlatformCode) => {
    selectedPlatformCode.value = platformCode
  }

  const loadPlatform = () => {
    selectedPlatformCode.value = normalizeStudentPlatform(
      createBrowserStoragePort().get(storageKey.value)
    )
    storageLoaded.value = true
  }

  onMounted(loadPlatform)

  watch(storageKey, () => {
    if (storageLoaded.value) {
      loadPlatform()
    }
  })

  watch(selectedPlatformCode, value => {
    if (storageLoaded.value) {
      createBrowserStoragePort().set(storageKey.value, value)
    }
  })

  return {
    launchpadState,
    selectedPlatformCode,
    selectPlatform
  }
}

const createBrowserStoragePort = () =>
  createSafeLocalStoragePort(
    typeof window === 'undefined' ? undefined : window.localStorage
  )
