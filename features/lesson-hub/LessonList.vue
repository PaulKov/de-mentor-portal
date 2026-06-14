<script setup lang="ts">
import StatusBadge from '~/components/shared/ui/StatusBadge.vue'
import type { LessonHubState } from './lesson-hub-state'

defineProps<{
  state: LessonHubState
}>()

const emit = defineEmits<{
  'select-lesson': [lessonCode: string]
}>()

const toneForStatus = (status: string) => status === 'ready' ? 'success' : 'warning'
</script>

<template>
  <section class="lesson-list" aria-label="Уроки направления">
    <article
      v-for="lesson in state.selectedTrack.lessons"
      :key="lesson.code"
      class="lesson-row"
      :class="{ active: state.selectedLesson.code === lesson.code }"
    >
      <button type="button" @click="emit('select-lesson', lesson.code)">
        <span>{{ lesson.duration }} · {{ lesson.level }}</span>
        <strong>{{ lesson.title }}</strong>
        <p>{{ lesson.summary }}</p>
      </button>
      <StatusBadge :tone="toneForStatus(lesson.status)">
        {{ lesson.status }}
      </StatusBadge>
    </article>
  </section>
</template>
