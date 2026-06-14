import { computed, onMounted, ref, watch, type Ref } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
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
  const storageKey = computed(() => createMentorStorageKey(session.value))

  const hydrate = () => {
    const storagePort = createSafeLocalStoragePort(
      typeof window === 'undefined' ? undefined : window.localStorage
    )
    localState.value = normalizeReviewLocalState(
      storagePort.get<Partial<ReviewLocalState>>(storageKey.value)
    )
  }

  const reviewState = computed(() => buildReviewCenterState(session.value, localState.value))
  const reportMarkdown = computed(() => createReviewReportMarkdown(reviewState.value))
  const exportJson = computed(() =>
    JSON.stringify(createReviewExportPayload(reviewState.value), null, 2)
  )

  onMounted(hydrate)
  watch(storageKey, hydrate)

  return {
    exportJson,
    hydrate,
    reportMarkdown,
    reviewState
  }
}
