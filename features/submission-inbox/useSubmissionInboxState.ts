import { computed, onMounted, ref, watch, type Ref } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import { createSafeLocalStoragePort } from '~/shared/utils/local-storage'
import {
  addSubmissionRecord,
  buildSubmissionInboxState,
  createSubmissionRecord,
  createSubmissionStorageKey,
  normalizeSubmissionLocalState,
  updateSubmissionDraftEvidence,
  type SubmissionLocalState
} from './submission-inbox-state'

export const useSubmissionInboxState = (session: Ref<AcademySession>) => {
  const localState = ref<SubmissionLocalState>(normalizeSubmissionLocalState())
  const storageLoaded = ref(false)
  const storageKey = computed(() => createSubmissionStorageKey(session.value))
  const inboxState = computed(() => buildSubmissionInboxState(session.value, localState.value))
  const latestReportMarkdown = computed(() => inboxState.value.latestReportMarkdown)
  const latestExportJson = computed(() =>
    JSON.stringify(inboxState.value.latestSubmission ?? inboxState.value.draft, null, 2)
  )

  const hydrate = () => {
    localState.value = normalizeSubmissionLocalState(
      createBrowserStoragePort().get(storageKey.value)
    )
    storageLoaded.value = true
  }

  const updateEvidence = (itemId: string, value: string) => {
    localState.value = {
      ...localState.value,
      draft: updateSubmissionDraftEvidence(localState.value.draft, itemId, value)
    }
    persist()
  }

  const submitDraft = () => {
    const record = createSubmissionRecord(
      session.value,
      inboxState.value.draft,
      inboxState.value.checklist
    )
    localState.value = addSubmissionRecord(localState.value, record)
    persist()
  }

  const persist = () => {
    if (storageLoaded.value) {
      createBrowserStoragePort().set(storageKey.value, localState.value)
    }
  }

  onMounted(hydrate)

  watch(storageKey, () => {
    if (storageLoaded.value) {
      hydrate()
    }
  })

  return {
    exportJson: latestExportJson,
    hydrate,
    inboxState,
    reportMarkdown: latestReportMarkdown,
    submitDraft,
    updateEvidence
  }
}

const createBrowserStoragePort = () =>
  createSafeLocalStoragePort(
    typeof window === 'undefined' ? undefined : window.localStorage
  )
