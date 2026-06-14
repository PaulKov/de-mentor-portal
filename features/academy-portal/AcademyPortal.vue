<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { AcademyCatalog } from '~/core/catalog/domain/academy-catalog'
import type { ValidationIssue } from '~/core/session/application/session-contract'
import type { AcademySession } from '~/core/session/domain/academy-session'
import LessonHub from '~/features/lesson-hub/LessonHub.vue'
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

type PortalSurface = 'hub' | 'workspace' | 'session' | 'review' | 'submission'

const surface = ref<PortalSurface>('hub')
const surfaceStorageKey = 'academy-portal-surface'
const workspaceSession = ref<AcademySession | null>(null)
const workspaceSource = ref('')

const selectSurface = (nextSurface: PortalSurface) => {
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

const activeSession = computed(() => workspaceSession.value ?? props.session)
const activeSource = computed(() => workspaceSession.value ? workspaceSource.value : props.sessionSource)
const activeIssues = computed(() => workspaceSession.value ? [] : props.sessionIssues)
const activeIsValid = computed(() => workspaceSession.value ? true : props.sessionIsValid)

onMounted(() => {
  const savedSurface = window.localStorage.getItem(surfaceStorageKey)
  if (
    savedSurface === 'hub' ||
    savedSurface === 'workspace' ||
    savedSurface === 'session' ||
    savedSurface === 'review' ||
    savedSurface === 'submission'
  ) {
    surface.value = savedSurface
  }
})

watch(
  () => props.catalogIsValid,
  isValid => {
    if (!isValid) {
      surface.value = 'session'
    }
  },
  { immediate: true }
)
</script>

<template>
  <LessonHub
    v-if="catalog && catalogIsValid && surface === 'hub'"
    :catalog="catalog"
    :catalog-source="catalogSource"
    :session-is-valid="sessionIsValid"
    @reload-catalog="emit('reload-catalog')"
    @open-session="openLiveSession"
    @open-workspace="selectSurface('workspace')"
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
  />

  <ReviewCenter
    v-else-if="activeSession && activeIsValid && surface === 'review'"
    :session="activeSession"
    :source="activeSource"
    :can-open-hub="catalogIsValid"
    :can-open-workspace="true"
    :can-open-submission="true"
    @open-hub="selectSurface('hub')"
    @open-workspace="selectSurface('workspace')"
    @open-session="selectSurface('session')"
    @open-submission="selectSurface('submission')"
  />

  <SubmissionInbox
    v-else-if="activeSession && activeIsValid && surface === 'submission'"
    :session="activeSession"
    :source="activeSource"
    :can-open-hub="catalogIsValid"
    :can-open-workspace="true"
    :can-open-review="true"
    :can-open-session="true"
    @open-hub="selectSurface('hub')"
    @open-workspace="selectSurface('workspace')"
    @open-review="selectSurface('review')"
    @open-session="selectSurface('session')"
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
    @reload="emit('reload-session')"
    @open-hub="selectSurface('hub')"
    @open-workspace="selectSurface('workspace')"
    @open-review="selectSurface('review')"
    @open-submission="selectSurface('submission')"
  />
</template>
