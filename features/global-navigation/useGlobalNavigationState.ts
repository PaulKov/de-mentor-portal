import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import type { AcademyCatalog } from '~/core/catalog/domain/academy-catalog'
import type { AcademySession } from '~/core/session/domain/academy-session'
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
  const navigationState = computed(() =>
    buildGlobalNavigationState({
      catalog: input.catalog.value,
      catalogSource: input.catalogSource.value,
      catalogIsValid: input.catalogIsValid.value,
      session: input.session.value,
      sessionSource: input.sessionSource.value,
      sessionIsValid: input.sessionIsValid.value,
      activeSurface: input.activeSurface.value
    })
  )

  const openCommandCenter = () => {
    isCommandCenterOpen.value = true
  }

  const closeCommandCenter = () => {
    isCommandCenterOpen.value = false
  }

  const toggleCommandCenter = () => {
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

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

  return {
    closeCommandCenter,
    isCommandCenterOpen,
    navigationState,
    openCommandCenter,
    toggleCommandCenter
  }
}
