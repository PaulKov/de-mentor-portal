<script setup lang="ts">
import CopyCommand from '~/components/shared/ui/CopyCommand.vue'
import Panel from '~/components/shared/ui/Panel.vue'

defineProps<{
  commands: string[]
}>()
</script>

<template>
  <Panel eyebrow="commands" title="Быстрые команды">
    <div class="command-list">
      <CopyCommand
        v-for="command in commands"
        :key="command"
        class="copy-command"
        title="Скопировать"
        :command="command"
      />
    </div>
  </Panel>
</template>
