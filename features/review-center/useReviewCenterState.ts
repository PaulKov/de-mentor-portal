import { computed, onMounted, ref, watch, type Ref } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import { createEvidenceLedgerStorageKey } from '~/features/evidence-ledger/evidence-ledger-state'
import { createMentorStorageKey } from '~/features/mentor-cockpit/mentor-cockpit-state'
import { createSafeLocalStoragePort } from '~/shared/utils/local-storage'
import {
  buildReviewCenterState,
  createReviewExportPayload,
  createReviewReportMarkdown,
  normalizeReviewLocalState,
  type ReviewLocalState
} from './review-center-state'

export const useReviewCenterState = (session: Ref<AcademySession>) => {
  const localState = ref<ReviewLocalState>(normalizeReviewLocalState())
  const mentorStorageKey = computed(() => createMentorStorageKey(session.value))
  const ledgerStorageKey = computed(() => createEvidenceLedgerStorageKey(session.value))

  const hydrate = () => {
    const storagePort = createSafeLocalStoragePort(
      typeof window === 'undefined' ? undefined : window.localStorage
    )
    const mentorState = storagePort.get<Partial<ReviewLocalState>>(mentorStorageKey.value)
    const ledgerState = storagePort.get<Partial<ReviewLocalState>>(ledgerStorageKey.value)
    localState.value = normalizeReviewLocalState({
      ...safeRecord(mentorState),
      ...safeRecord(ledgerState)
    })
  }

  const reviewState = computed(() => buildReviewCenterState(session.value, localState.value))
  const reportMarkdown = computed(() => createReviewReportMarkdown(reviewState.value))
  const exportJson = computed(() =>
    JSON.stringify(createReviewExportPayload(reviewState.value), null, 2)
  )

  onMounted(hydrate)
  watch([mentorStorageKey, ledgerStorageKey], hydrate)

  return {
    exportJson,
    hydrate,
    reportMarkdown,
    reviewState
  }
}

const safeRecord = (value: unknown) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
