<script setup lang="ts">
import CopyCommand from '~/components/shared/ui/CopyCommand.vue'
import type { MentorCockpitState } from './mentor-cockpit-state'

defineProps<{
  state: MentorCockpitState
}>()
</script>

<template>
  <section class="slide-command-rail panel" aria-label="Slides and commands">
    <div class="panel-heading">
      <p class="muted">slides and commands</p>
      <h2>Презентация и команды</h2>
    </div>

    <a
      v-if="state.googleSlidesUrl"
      class="slide-link"
      :href="state.googleSlidesUrl"
      target="_blank"
      rel="noreferrer"
    >
      Открыть Google Slides
    </a>
    <p v-else class="muted">Google Slides пока не подключены к control plane.</p>

    <p class="slide-anchor">
      {{ state.slideDeck || 'Deck artifact is unavailable' }} · {{ state.slideLabel }}
    </p>

    <div class="command-list">
      <CopyCommand
        v-for="command in state.commands"
        :key="command"
        title="Показать в терминале"
        :command="command"
      />
    </div>
  </section>
</template>
