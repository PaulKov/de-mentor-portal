import { computed, onMounted, ref, watch, type Ref } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import { createEvidenceLedgerStorageKey } from '~/features/evidence-ledger/evidence-ledger-state'
import { createMentorStorageKey } from '~/features/mentor-cockpit/mentor-cockpit-state'
import { createSubmissionStorageKey } from '~/features/submission-inbox/submission-inbox-state'
import { createSafeLocalStoragePort } from '~/shared/utils/local-storage'
import {
  buildAssessmentCenterState,
  createAssessmentExport,
  type AssessmentCenterInput
} from './assessment-center-state'

export const useAssessmentCenterState = (session: Ref<AcademySession>) => {
  const localInput = ref<AssessmentCenterInput>({})
  const mentorStorageKey = computed(() => createMentorStorageKey(session.value))
  const ledgerStorageKey = computed(() => createEvidenceLedgerStorageKey(session.value))
  const submissionStorageKey = computed(() => createSubmissionStorageKey(session.value))

  const hydrate = () => {
    const storagePort = createSafeLocalStoragePort(
      typeof window === 'undefined' ? undefined : window.localStorage
    )
    const mentorState = safeRecord(storagePort.get(mentorStorageKey.value))
    const ledgerState = safeRecord(storagePort.get(ledgerStorageKey.value))
    const submissionState = safeRecord(storagePort.get(submissionStorageKey.value))

    localInput.value = {
      ...mentorState,
      ...ledgerState,
      submissionState
    }
  }

  const assessmentState = computed(() =>
    buildAssessmentCenterState(session.value, localInput.value)
  )
  const reportMarkdown = computed(() => assessmentState.value.reportMarkdown)
  const exportJson = computed(() =>
    JSON.stringify(createAssessmentExport(assessmentState.value), null, 2)
  )

  onMounted(hydrate)
  watch([mentorStorageKey, ledgerStorageKey, submissionStorageKey], hydrate)

  return {
    assessmentState,
    exportJson,
    hydrate,
    reportMarkdown
  }
}

const safeRecord = (value: unknown) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
