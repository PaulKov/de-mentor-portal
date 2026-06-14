<script setup lang="ts">
import type { DashboardMode } from './session-dashboard-mode'

defineProps<{
  activeMode: DashboardMode
}>()

const emit = defineEmits<{
  'select-mode': [mode: DashboardMode]
}>()

const modes: { code: DashboardMode; label: string }[] = [
  { code: 'mentor', label: 'Ментор' },
  { code: 'student', label: 'Ученик' }
]
</script>

<template>
  <div class="mode-switch" role="group" aria-label="Режим портала">
    <button
      v-for="mode in modes"
      :key="mode.code"
      type="button"
      :class="{ active: activeMode === mode.code }"
      :aria-pressed="activeMode === mode.code"
      @click="emit('select-mode', mode.code)"
    >
      {{ mode.label }}
    </button>
  </div>
</template>
