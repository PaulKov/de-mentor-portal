<script setup lang="ts">
import CopyButton from '~/components/shared/ui/CopyButton.vue'
import CopyCommand from '~/components/shared/ui/CopyCommand.vue'
import Panel from '~/components/shared/ui/Panel.vue'
import StatusBadge from '~/components/shared/ui/StatusBadge.vue'
import DashboardModeSwitch from '~/features/session-dashboard/DashboardModeSwitch.vue'
import type { LessonHubRole, LessonHubState } from './lesson-hub-state'

defineProps<{
  state: LessonHubState
}>()

const emit = defineEmits<{
  'select-role': [role: LessonHubRole]
}>()

const toneForStatus = (status: string) => status === 'ready' ? 'success' : 'warning'
</script>

<template>
  <aside class="lesson-action-rail" aria-label="Материалы и команды урока">
    <Panel eyebrow="role" title="Роль в уроке">
      <DashboardModeSwitch
        :active-mode="state.selectedRole"
        @select-mode="emit('select-role', $event)"
      />
    </Panel>

    <Panel eyebrow="readiness" title="Готовность">
      <ul class="readiness-stack">
        <li v-for="item in state.selectedLesson.readiness" :key="item.label">
          <StatusBadge :tone="toneForStatus(item.status)">
            {{ item.status }}
          </StatusBadge>
          <strong>{{ item.label }}</strong>
          <p>{{ item.detail }}</p>
        </li>
      </ul>
    </Panel>

    <Panel eyebrow="materials" title="Материалы">
      <div class="hub-material-list">
        <article v-for="material in state.selectedLesson.materials" :key="material.path">
          <div>
            <strong>{{ material.label }}</strong>
            <span>{{ material.kind }}</span>
            <code>{{ material.path }}</code>
          </div>
          <CopyButton :text="material.path" label="Копировать" />
        </article>
      </div>
    </Panel>

    <Panel eyebrow="commands" title="Команды">
      <div class="hub-command-list">
        <CopyCommand
          v-for="command in state.selectedCommands"
          :key="command"
          title="Run command"
          :command="command"
        />
      </div>
    </Panel>
  </aside>
</template>
