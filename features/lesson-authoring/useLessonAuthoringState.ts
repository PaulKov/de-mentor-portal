import { computed, onMounted, ref, watch, type Ref } from 'vue'
import type { AcademyCatalog } from '~/core/catalog/domain/academy-catalog'
import { createSafeLocalStoragePort } from '~/shared/utils/local-storage'
import {
  buildLessonAuthoringState,
  createLessonAuthoringStorageKey,
  type LessonAuthoringDraft,
  type LessonAuthoringStageDraft
} from './lesson-authoring-state'

interface AuthoringSelection {
  trackCode?: string
  lessonCode?: string
}

export const useLessonAuthoringState = (catalog: Ref<AcademyCatalog>) => {
  const selection = ref<AuthoringSelection>({})
  const draft = ref<Partial<LessonAuthoringDraft>>({})
  const storageLoaded = ref(false)
  const selectionStorageKey = computed(() =>
    ['lesson-authoring-selection', catalog.value.contract_version, catalog.value.generated_at].join(':')
  )
  const authoringState = computed(() => buildLessonAuthoringState(catalog.value, {
    ...selection.value,
    draft: draft.value
  }))
  const draftStorageKey = computed(() =>
    createLessonAuthoringStorageKey(
      catalog.value,
      authoringState.value.selectedTrack.code,
      authoringState.value.selectedLesson.code
    )
  )

  const selectTrack = (trackCode: string) => {
    selection.value = { trackCode }
    draft.value = {}
  }

  const selectLesson = (lessonCode: string) => {
    selection.value = {
      ...selection.value,
      lessonCode
    }
    draft.value = {}
  }

  const updateDraft = (patch: Partial<LessonAuthoringDraft>) => {
    draft.value = {
      ...authoringState.value.draft,
      ...patch
    }
  }

  const updateStage = (
    index: number,
    field: keyof LessonAuthoringStageDraft,
    value: string | number
  ) => {
    const stages = authoringState.value.draft.stages.map((stage, stageIndex) =>
      stageIndex === index ? { ...stage, [field]: value } : stage
    )
    updateDraft({ stages })
  }

  const resetDraft = () => {
    draft.value = {}
  }

  const loadLocalState = () => {
    const storagePort = createBrowserStoragePort()
    selection.value = normalizeSelection(storagePort.get(selectionStorageKey.value))
    draft.value = normalizeDraft(storagePort.get(draftStorageKey.value))
    storageLoaded.value = true
  }

  onMounted(loadLocalState)

  watch(draftStorageKey, () => {
    if (storageLoaded.value) {
      draft.value = normalizeDraft(createBrowserStoragePort().get(draftStorageKey.value))
    }
  })

  watch(selection, value => {
    if (storageLoaded.value) {
      createBrowserStoragePort().set(selectionStorageKey.value, value)
    }
  }, { deep: true })

  watch(draft, value => {
    if (storageLoaded.value) {
      createBrowserStoragePort().set(draftStorageKey.value, value)
    }
  }, { deep: true })

  return {
    authoringState,
    resetDraft,
    selectLesson,
    selectTrack,
    updateDraft,
    updateStage
  }
}

const normalizeSelection = (value: unknown): AuthoringSelection => {
  if (!isRecord(value)) {
    return {}
  }

  return {
    trackCode: typeof value.trackCode === 'string' ? value.trackCode : undefined,
    lessonCode: typeof value.lessonCode === 'string' ? value.lessonCode : undefined
  }
}

const normalizeDraft = (value: unknown): Partial<LessonAuthoringDraft> =>
  isRecord(value) ? value as Partial<LessonAuthoringDraft> : {}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const createBrowserStoragePort = () =>
  createSafeLocalStoragePort(
    typeof window === 'undefined' ? undefined : window.localStorage
  )
