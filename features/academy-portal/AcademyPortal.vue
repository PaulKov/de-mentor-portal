<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { AcademyCatalog } from '~/core/catalog/domain/academy-catalog'
import type { ValidationIssue } from '~/core/session/application/session-contract'
import type { AcademySession } from '~/core/session/domain/academy-session'
import CohortDashboard from '~/features/cohort-dashboard/CohortDashboard.vue'
import GlobalNavigation from '~/features/global-navigation/GlobalNavigation.vue'
import {
  createPortalSurfaceStorageKey,
  normalizePortalSurface,
  type PortalSurface
} from '~/features/global-navigation/global-navigation-state'
import { useGlobalNavigationState } from '~/features/global-navigation/useGlobalNavigationState'
import LessonHub from '~/features/lesson-hub/LessonHub.vue'
import PostLessonPack from '~/features/post-lesson-pack/PostLessonPack.vue'
import ReleaseConsole from '~/features/release-console/ReleaseConsole.vue'
import ReviewCenter from '~/features/review-center/ReviewCenter.vue'
import SessionDashboard from '~/features/session-dashboard/SessionDashboard.vue'
import SessionWorkspace from '~/features/session-workspace/SessionWorkspace.vue'
import SubmissionInbox from '~/features/submission-inbox/SubmissionInbox.vue'

const props = defineProps<{
  catalog: AcademyCatalog | null
  catalogSource: string
  catalogIsValid: boolean
  session: AcademySession | null
  sessionSource: string
  sessionIssues: ValidationIssue[]
  sessionIsValid: boolean
}>()

const emit = defineEmits<{
  'reload-catalog': []
  'reload-session': []
}>()

const surface = ref<PortalSurface>('hub')
const surfaceStorageKey = createPortalSurfaceStorageKey()
const workspaceSession = ref<AcademySession | null>(null)
const workspaceSource = ref('')

const activeSession = computed(() => workspaceSession.value ?? props.session)
const activeSource = computed(() => workspaceSession.value ? workspaceSource.value : props.sessionSource)
const activeIssues = computed(() => workspaceSession.value ? [] : props.sessionIssues)
const activeIsValid = computed(() => workspaceSession.value ? true : props.sessionIsValid)

const {
  closeCommandCenter,
  isCommandCenterOpen,
  navigationState,
  toggleCommandCenter
} = useGlobalNavigationState({
  catalog: computed(() => props.catalog),
  catalogSource: computed(() => props.catalogSource),
  catalogIsValid: computed(() => props.catalogIsValid),
  session: activeSession,
  sessionSource: activeSource,
  sessionIsValid: activeIsValid,
  activeSurface: surface
})

const selectSurface = (nextSurface: PortalSurface) => {
  const item = navigationState.value.items.find(entry => entry.surface === nextSurface)
  if (item && !item.isEnabled) {
    return
  }

  surface.value = nextSurface
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(surfaceStorageKey, nextSurface)
  }
}

const openLiveSession = () => {
  workspaceSession.value = null
  workspaceSource.value = ''
  selectSurface('session')
}

const openWorkspaceSession = (payload: { session: AcademySession; source: string }) => {
  workspaceSession.value = payload.session
  workspaceSource.value = payload.source
  selectSurface('session')
}

const openWorkspaceReview = (payload: { session: AcademySession; source: string }) => {
  workspaceSession.value = payload.session
  workspaceSource.value = payload.source
  selectSurface('review')
}

const openWorkspaceSubmission = (payload: { session: AcademySession; source: string }) => {
  workspaceSession.value = payload.session
  workspaceSource.value = payload.source
  selectSurface('submission')
}

onMounted(() => {
  surface.value = normalizePortalSurface(window.localStorage.getItem(surfaceStorageKey))
})

watch(
  navigationState,
  state => {
    if (state.activeSurface !== surface.value) {
      selectSurface(state.activeSurface)
    }
  },
  { immediate: true }
)
</script>

<template>
  <section class="portal-frame">
    <GlobalNavigation
      :state="navigationState"
      :is-command-center-open="isCommandCenterOpen"
      @navigate="selectSurface"
      @toggle-command-center="toggleCommandCenter"
      @close-command-center="closeCommandCenter"
    />

    <div class="portal-frame__surface">
      <LessonHub
        v-if="catalog && catalogIsValid && surface === 'hub'"
        :catalog="catalog"
        :catalog-source="catalogSource"
        :session-is-valid="sessionIsValid"
        @reload-catalog="emit('reload-catalog')"
        @open-session="openLiveSession"
        @open-workspace="selectSurface('workspace')"
        @open-cohort="selectSurface('cohort')"
        @open-release="selectSurface('release')"
      />

      <ReleaseConsole
        v-else-if="catalog && catalogIsValid && surface === 'release'"
        :catalog="catalog"
        :session="activeSession"
        :source="catalogSource"
        :can-open-hub="true"
        :can-open-session="Boolean(activeSession && activeIsValid)"
        @open-hub="selectSurface('hub')"
        @open-session="selectSurface('session')"
      />

      <SessionWorkspace
        v-else-if="surface === 'workspace'"
        :current-session="session"
        :current-source="sessionSource"
        :current-is-valid="sessionIsValid"
        @open-hub="selectSurface('hub')"
        @open-current-session="openLiveSession"
        @open-session="openWorkspaceSession"
        @open-review="openWorkspaceReview"
        @open-submission="openWorkspaceSubmission"
        @open-cohort="selectSurface('cohort')"
      />

      <ReviewCenter
        v-else-if="activeSession && activeIsValid && surface === 'review'"
        :session="activeSession"
        :source="activeSource"
        :can-open-hub="catalogIsValid"
        :can-open-workspace="true"
        :can-open-submission="true"
        :can-open-cohort="true"
        @open-hub="selectSurface('hub')"
        @open-workspace="selectSurface('workspace')"
        @open-session="selectSurface('session')"
        @open-submission="selectSurface('submission')"
        @open-cohort="selectSurface('cohort')"
      />

      <SubmissionInbox
        v-else-if="activeSession && activeIsValid && surface === 'submission'"
        :session="activeSession"
        :source="activeSource"
        :can-open-hub="catalogIsValid"
        :can-open-workspace="true"
        :can-open-review="true"
        :can-open-session="true"
        :can-open-cohort="true"
        @open-hub="selectSurface('hub')"
        @open-workspace="selectSurface('workspace')"
        @open-review="selectSurface('review')"
        @open-session="selectSurface('session')"
        @open-cohort="selectSurface('cohort')"
      />

      <CohortDashboard
        v-else-if="activeSession && activeIsValid && surface === 'cohort'"
        :session="activeSession"
        :source="activeSource"
        :can-open-hub="catalogIsValid"
        :can-open-workspace="true"
        :can-open-session="true"
        :can-open-review="true"
        :can-open-submission="true"
        @open-hub="selectSurface('hub')"
        @open-workspace="selectSurface('workspace')"
        @open-session="selectSurface('session')"
        @open-review="selectSurface('review')"
        @open-submission="selectSurface('submission')"
      />

      <PostLessonPack
        v-else-if="activeSession && activeIsValid && surface === 'post-lesson'"
        :session="activeSession"
        :source="activeSource"
        :can-open-hub="catalogIsValid"
        :can-open-workspace="true"
        :can-open-session="true"
        :can-open-review="true"
        :can-open-submission="true"
        :can-open-cohort="true"
        @open-hub="selectSurface('hub')"
        @open-workspace="selectSurface('workspace')"
        @open-session="selectSurface('session')"
        @open-review="selectSurface('review')"
        @open-submission="selectSurface('submission')"
        @open-cohort="selectSurface('cohort')"
      />

      <SessionDashboard
        v-else
        :session="activeSession"
        :source="activeSource"
        :issues="activeIssues"
        :is-valid="activeIsValid"
        :can-open-hub="catalogIsValid"
        :can-open-workspace="true"
        :can-open-review="true"
        :can-open-submission="true"
        :can-open-cohort="true"
        @reload="emit('reload-session')"
        @open-hub="selectSurface('hub')"
        @open-workspace="selectSurface('workspace')"
        @open-review="selectSurface('review')"
        @open-submission="selectSurface('submission')"
        @open-cohort="selectSurface('cohort')"
      />
    </div>
  </section>
</template>
