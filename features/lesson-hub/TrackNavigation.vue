<script setup lang="ts">
import StatusBadge from '~/components/shared/ui/StatusBadge.vue'
import type { LessonHubState } from './lesson-hub-state'

defineProps<{
  state: LessonHubState
}>()

const emit = defineEmits<{
  'select-track': [trackCode: string]
}>()

const toneForStatus = (status: string) => status === 'ready' ? 'success' : 'warning'
</script>

<template>
  <aside class="hub-track-nav" aria-label="Направления академии">
    <div class="hub-brand">
      <span class="brand-mark">DE</span>
      <div>
        <strong>Academy Hub</strong>
        <small>tracks and lessons</small>
      </div>
    </div>

    <button
      v-for="track in state.trackSummaries"
      :key="track.code"
      type="button"
      class="track-button"
      :class="{ active: state.selectedTrack.code === track.code }"
      :aria-pressed="state.selectedTrack.code === track.code"
      @click="emit('select-track', track.code)"
    >
      <span>{{ track.title }}</span>
      <small>{{ track.readyCount }}/{{ track.lessonCount }} ready</small>
      <StatusBadge :tone="toneForStatus(track.status)">
        {{ track.status }}
      </StatusBadge>
    </button>
  </aside>
</template>
