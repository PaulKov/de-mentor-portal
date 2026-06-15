import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import type { AcademyCatalog } from '~/core/catalog/domain/academy-catalog'
import type { AcademySession } from '~/core/session/domain/academy-session'
import {
  buildEvidenceLedgerState,
  createEvidenceLedgerStorageKey
} from '~/features/evidence-ledger/evidence-ledger-state'
import { createMentorStorageKey } from '~/features/mentor-cockpit/mentor-cockpit-state'
import { createSafeLocalStoragePort } from '~/shared/utils/local-storage'
import {
  buildGlobalNavigationState,
  type PortalSurface
} from './global-navigation-state'

interface UseGlobalNavigationInput {
  catalog: Ref<AcademyCatalog | null>
  catalogSource: Ref<string>
  catalogIsValid: Ref<boolean>
  session: Ref<AcademySession | null>
  sessionSource: Ref<string>
  sessionIsValid: Ref<boolean>
  activeSurface: Ref<PortalSurface>
}

export const useGlobalNavigationState = (input: UseGlobalNavigationInput) => {
  const isCommandCenterOpen = ref(false)
  const ledgerReportMarkdown = ref('')
  const navigationState = computed(() =>
    buildGlobalNavigationState({
      catalog: input.catalog.value,
      catalogSource: input.catalogSource.value,
      catalogIsValid: input.catalogIsValid.value,
      session: input.session.value,
      sessionSource: input.sessionSource.value,
      sessionIsValid: input.sessionIsValid.value,
      activeSurface: input.activeSurface.value,
      ledgerReportMarkdown: ledgerReportMarkdown.value
    })
  )

  const openCommandCenter = () => {
    refreshLedgerReport()
    isCommandCenterOpen.value = true
  }

  const closeCommandCenter = () => {
    isCommandCenterOpen.value = false
  }

  const toggleCommandCenter = () => {
    if (!isCommandCenterOpen.value) {
      refreshLedgerReport()
    }
    isCommandCenterOpen.value = !isCommandCenterOpen.value
  }

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeCommandCenter()
      return
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      toggleCommandCenter()
    }
  }

  const refreshLedgerReport = () => {
    if (!input.session.value || !input.sessionIsValid.value) {
      ledgerReportMarkdown.value = ''
      return
    }

    const storagePort = createSafeLocalStoragePort(
      typeof window === 'undefined' ? undefined : window.localStorage
    )
    const mentorState = safeRecord(storagePort.get(createMentorStorageKey(input.session.value)))
    const ledgerState = safeRecord(storagePort.get(createEvidenceLedgerStorageKey(input.session.value)))
    ledgerReportMarkdown.value = buildEvidenceLedgerState(input.session.value, {
      ...mentorState,
      ...ledgerState
    }).handoffMarkdown
  }

  onMounted(() => {
    refreshLedgerReport()
    window.addEventListener('keydown', onKeydown)
  })
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
  watch([input.session, input.sessionIsValid], refreshLedgerReport)

  return {
    closeCommandCenter,
    isCommandCenterOpen,
    navigationState,
    openCommandCenter,
    toggleCommandCenter
  }
}

const safeRecord = (value: unknown) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
