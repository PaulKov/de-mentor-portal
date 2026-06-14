<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { AcademyCatalog } from '~/core/catalog/domain/academy-catalog'
import type { ValidationIssue } from '~/core/session/application/session-contract'
import type { AcademySession } from '~/core/session/domain/academy-session'
import LessonHub from '~/features/lesson-hub/LessonHub.vue'
import SessionDashboard from '~/features/session-dashboard/SessionDashboard.vue'

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

const surface = ref<'hub' | 'session'>('hub')
const surfaceStorageKey = 'academy-portal-surface'

const selectSurface = (nextSurface: 'hub' | 'session') => {
  surface.value = nextSurface
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(surfaceStorageKey, nextSurface)
  }
}

onMounted(() => {
  const savedSurface = window.localStorage.getItem(surfaceStorageKey)
  if (savedSurface === 'hub' || savedSurface === 'session') {
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
    :catalog-issues="catalogIssues"
    :session-is-valid="sessionIsValid"
    @reload-catalog="emit('reload-catalog')"
    @open-session="selectSurface('session')"
  />

  <SessionDashboard
    v-else
    :session="session"
    :source="sessionSource"
    :issues="sessionIssues"
    :is-valid="sessionIsValid"
    :can-open-hub="catalogIsValid"
    @reload="emit('reload-session')"
    @open-hub="selectSurface('hub')"
  />
</template>
