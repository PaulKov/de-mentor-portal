import { computed, onMounted, ref, watch, type Ref } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import { createSafeLocalStoragePort } from '~/shared/utils/local-storage'
import {
  buildHomeworkReviewStudioState,
  createEmptyHomeworkReviewLocalState,
  createHomeworkReviewStorageKey,
  normalizeHomeworkReviewLocalState,
  type HomeworkReviewFlags,
  type HomeworkReviewLocalState
} from './homework-review-state'

export const useHomeworkReviewState = (session: Ref<AcademySession>) => {
  const storageLoaded = ref(false)
  const localStateChangedBeforeLoad = ref(false)
  const localState = ref<HomeworkReviewLocalState>(createEmptyHomeworkReviewLocalState())
  const storageKey = computed(() => createHomeworkReviewStorageKey(session.value))
  const reviewState = computed(() => buildHomeworkReviewStudioState(session.value, localState.value))

  const selectRubric = (code: string) => {
    patchLocalState({ selectedRubricCode: code })
  }

  const toggleRubric = (code: string, checked: boolean) => {
    patchLocalState({ checkedRubric: toggleCode(localState.value.checkedRubric, code, checked) })
  }

  const toggleChecklist = (code: string, checked: boolean) => {
    patchLocalState({
      checkedChecklist: toggleCode(localState.value.checkedChecklist, code, checked)
    })
  }

  const updateNotes = (notes: string) => {
    patchLocalState({ notes })
  }

  const updateConclusionText = (conclusionText: string) => {
    patchLocalState({ conclusionText })
  }

  const setFlag = (flag: keyof HomeworkReviewFlags, value: boolean) => {
    patchLocalState({
      flags: {
        ...localState.value.flags,
        [flag]: value
      }
    })
  }

  const markNextPlanSent = () => {
    setFlag('next_plan_sent', true)
  }

  const patchLocalState = (patch: Partial<HomeworkReviewLocalState>) => {
    localState.value = normalizeHomeworkReviewLocalState(
      {
        ...localState.value,
        ...patch
      },
      session.value.homework_review
    )
    if (!storageLoaded.value) {
      localStateChangedBeforeLoad.value = true
    }
  }

  const loadLocalState = () => {
    const storagePort = createBrowserStoragePort()
    const savedState = storagePort.get<Partial<HomeworkReviewLocalState>>(storageKey.value)
    if (localStateChangedBeforeLoad.value) {
      storagePort.set(storageKey.value, localState.value)
    } else {
      localState.value = normalizeHomeworkReviewLocalState(
        savedState,
        session.value.homework_review
      )
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
    localState,
    reviewState,
    markNextPlanSent,
    selectRubric,
    setFlag,
    toggleChecklist,
    toggleRubric,
    updateConclusionText,
    updateNotes
  }
}

const toggleCode = (codes: string[], code: string, checked: boolean) => {
  const nextCodes = new Set(codes)
  if (checked) {
    nextCodes.add(code)
  } else {
    nextCodes.delete(code)
  }
  return Array.from(nextCodes)
}

const createBrowserStoragePort = () =>
  createSafeLocalStoragePort(
    typeof window === 'undefined' ? undefined : window.localStorage
  )
