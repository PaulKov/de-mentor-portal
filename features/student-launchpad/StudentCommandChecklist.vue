<script setup lang="ts">
import CopyCommand from '~/components/shared/ui/CopyCommand.vue'
import Panel from '~/components/shared/ui/Panel.vue'
import type { StudentLaunchpadState } from './student-launchpad-state'

defineProps<{
  state: StudentLaunchpadState
}>()
</script>

<template>
  <Panel class="student-command-panel" eyebrow="commands" title="Запуск и self-check">
    <div class="student-command-grid">
      <section>
        <h3>Команды портала</h3>
        <CopyCommand
          v-for="command in state.portalCommands"
          :key="command"
          title="Portal command"
          :command="command"
        />
      </section>

      <section>
        <h3>Self-check</h3>
        <CopyCommand
          v-for="command in state.selfCheckCommands"
          :key="command"
          title="Student self-check"
          :command="command"
        />
      </section>
    </div>
  </Panel>
</template>
