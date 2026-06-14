<script setup lang="ts">
import type { ReleaseStatus } from './mentor-cockpit-state'

const props = defineProps<{
  status: ReleaseStatus
}>()

const items = [
  ['session', 'session'],
  ['controlPlane', 'control plane'],
  ['slides', 'slides'],
  ['commands', 'commands']
] as const
</script>

<template>
  <section class="release-strip" aria-label="Release readiness">
    <div
      v-for="[key, label] in items"
      :key="key"
      class="release-signal"
      :class="`release-signal--${props.status[key]}`"
    >
      <span>{{ label }}</span>
      <strong>{{ props.status[key] }}</strong>
    </div>
  </section>
</template>
