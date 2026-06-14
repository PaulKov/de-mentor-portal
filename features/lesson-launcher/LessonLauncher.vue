<script setup lang="ts">
import { toRef } from 'vue'
import type { CatalogLesson, CatalogTrack } from '~/core/catalog/domain/academy-catalog'
import CopyCommand from '~/components/shared/ui/CopyCommand.vue'
import Panel from '~/components/shared/ui/Panel.vue'
import StatusBadge from '~/components/shared/ui/StatusBadge.vue'
import { useLessonLauncherState } from './useLessonLauncherState'

const props = defineProps<{
  track: CatalogTrack
  lesson: CatalogLesson
  catalogGeneratedAt: string
}>()

const trackRef = toRef(props, 'track')
const lessonRef = toRef(props, 'lesson')
const catalogGeneratedAtRef = toRef(props, 'catalogGeneratedAt')
const {
  launcherState,
  selectPlatform,
  selectRoute,
  updateOutputDir,
  updateStudentName
} = useLessonLauncherState(trackRef, lessonRef, catalogGeneratedAtRef)

const onStudentInput = (event: Event) => {
  updateStudentName((event.target as HTMLInputElement).value)
}

const onOutputInput = (event: Event) => {
  updateOutputDir((event.target as HTMLInputElement).value)
}
</script>

<template>
  <Panel class="lesson-launcher" eyebrow="launcher" title="Запуск урока">
    <template v-if="launcherState.isAvailable">
      <div class="launcher-form-grid">
        <label>
          <span>Имя ученика</span>
          <input
            type="text"
            :value="launcherState.studentName"
            autocomplete="off"
            @input="onStudentInput"
          >
        </label>
        <label>
          <span>Папка session</span>
          <input
            type="text"
            :value="launcherState.outputDir"
            autocomplete="off"
            @input="onOutputInput"
          >
        </label>
      </div>

      <div class="launcher-section">
        <p class="muted">route</p>
        <div class="launcher-option-grid">
          <button
            v-for="route in launcherState.routes"
            :key="route.code"
            type="button"
            class="launcher-option"
            :class="{ active: launcherState.selectedRoute?.code === route.code }"
            :aria-pressed="launcherState.selectedRoute?.code === route.code"
            @click="selectRoute(route.code)"
          >
            <strong>{{ route.title }}</strong>
            <span>{{ route.timebox }}</span>
            <p>{{ route.description }}</p>
          </button>
        </div>
      </div>

      <div class="launcher-section">
        <p class="muted">platform</p>
        <div class="launcher-option-grid launcher-option-grid--compact">
          <button
            v-for="platform in launcherState.platforms"
            :key="platform.code"
            type="button"
            class="launcher-option"
            :class="{ active: launcherState.selectedPlatform?.code === platform.code }"
            :aria-pressed="launcherState.selectedPlatform?.code === platform.code"
            @click="selectPlatform(platform.code)"
          >
            <strong>{{ platform.title }}</strong>
          </button>
        </div>
      </div>

      <div class="launcher-section">
        <p class="muted">platform checks</p>
        <ul class="launcher-checks">
          <li v-for="check in launcherState.platformChecks" :key="check">
            <code>{{ check }}</code>
          </li>
        </ul>
        <p v-for="note in launcherState.platformNotes" :key="note" class="launcher-note">
          {{ note }}
        </p>
      </div>

      <div class="launcher-command-stack">
        <CopyCommand
          v-for="command in launcherState.commands"
          :key="command.label"
          :title="command.label"
          :command="command.command"
        />
      </div>
    </template>

    <div v-else class="launcher-unavailable">
      <StatusBadge tone="warning">planned</StatusBadge>
      <p>
        Launch-пакет появится, когда для урока будет опубликован `launcher`
        в `academy-catalog/v1`.
      </p>
    </div>
  </Panel>
</template>
