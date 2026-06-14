<script setup lang="ts">
import Panel from '~/components/shared/ui/Panel.vue'
import type {
  StudentLaunchpadState,
  StudentPlatformCode
} from './student-launchpad-state'

defineProps<{
  state: StudentLaunchpadState
}>()

const emit = defineEmits<{
  'select-platform': [platformCode: StudentPlatformCode]
}>()
</script>

<template>
  <Panel
    class="platform-readiness"
    eyebrow="student readiness"
    title="Подготовка окружения"
    aria-label="Подготовка окружения ученика"
  >
    <div class="platform-tabs" role="group" aria-label="Платформа ученика">
      <button
        v-for="platform in state.platforms"
        :key="platform.code"
        type="button"
        :class="{ active: state.selectedPlatform.code === platform.code }"
        :aria-pressed="state.selectedPlatform.code === platform.code"
        @click="emit('select-platform', platform.code)"
      >
        {{ platform.label }}
      </button>
    </div>

    <ol class="readiness-list">
      <li v-for="step in state.readinessSteps" :key="step.id">
        <div>
          <strong>{{ step.title }}</strong>
          <p>{{ step.note }}</p>
        </div>
        <code>{{ step.command }}</code>
        <span>{{ step.verification }}</span>
      </li>
    </ol>
  </Panel>
</template>
