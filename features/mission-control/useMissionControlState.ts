import { computed, onMounted, ref, watch, type Ref } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import { createEvidenceLedgerStorageKey } from '~/features/evidence-ledger/evidence-ledger-state'
import { createMentorStorageKey } from '~/features/mentor-cockpit/mentor-cockpit-state'
import { createSubmissionStorageKey } from '~/features/submission-inbox/submission-inbox-state'
import { createSafeLocalStoragePort } from '~/shared/utils/local-storage'
import {
  buildMissionControlState,
  type MissionControlInput
} from './mission-control-state'

export const useMissionControlState = (
  session: Ref<AcademySession>,
  options: { catalogIsValid: Ref<boolean>; sessionIsValid: Ref<boolean> }
) => {
  const localInput = ref<MissionControlInput>({})
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
      catalogIsValid: options.catalogIsValid.value,
      sessionIsValid: options.sessionIsValid.value,
      submissionState
    }
  }

  const missionState = computed(() => buildMissionControlState(session.value, {
    ...localInput.value,
    catalogIsValid: options.catalogIsValid.value,
    sessionIsValid: options.sessionIsValid.value
  }))
  const reportMarkdown = computed(() => missionState.value.reportMarkdown)

  onMounted(hydrate)
  watch([mentorStorageKey, ledgerStorageKey, submissionStorageKey], hydrate)
  watch([options.catalogIsValid, options.sessionIsValid], hydrate)

  return {
    hydrate,
    missionState,
    reportMarkdown
  }
}

const safeRecord = (value: unknown) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
