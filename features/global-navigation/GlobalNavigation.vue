<script setup lang="ts">
import { ref } from 'vue'
import type {
  GlobalNavigationCommand,
  GlobalNavigationState,
  PortalSurface
} from './global-navigation-state'
import { copyTextToClipboard } from '~/shared/utils/clipboard'

const props = defineProps<{
  state: GlobalNavigationState
  isCommandCenterOpen: boolean
}>()

const emit = defineEmits<{
  closeCommandCenter: []
  navigate: [surface: PortalSurface]
  toggleCommandCenter: []
}>()

const copiedCommandId = ref('')
const failedCommandId = ref('')

const executeCommand = async (command: GlobalNavigationCommand) => {
  if (!command.isEnabled) {
    return
  }

  if (command.kind === 'navigate' && command.surface) {
    emit('navigate', command.surface)
    emit('closeCommandCenter')
    return
  }

  if (command.kind === 'copy' && command.value) {
    await copyCommand(command)
  }
}

const copyCommand = async (command: GlobalNavigationCommand) => {
  try {
    await copyTextToClipboard(command.value ?? '')
    copiedCommandId.value = command.id
    failedCommandId.value = ''
    window.setTimeout(() => {
      if (copiedCommandId.value === command.id) {
        copiedCommandId.value = ''
      }
    }, 1200)
  } catch {
    failedCommandId.value = command.id
  }
}

const commandStateLabel = (command: GlobalNavigationCommand) => {
  if (failedCommandId.value === command.id) {
    return 'Не скопировано'
  }

  return copiedCommandId.value === command.id ? 'Скопировано' : command.label
}
</script>

<template>
  <header class="global-navigation">
    <nav class="global-navigation__bar" aria-label="Global portal navigation">
      <div class="global-navigation__context">
        <span class="global-navigation__eyebrow">DE Mentor Portal</span>
        <strong>{{ state.context.primaryLabel }}</strong>
        <small>{{ state.context.secondaryLabel }}</small>
      </div>

      <div class="global-navigation__items">
        <button
          v-for="item in state.items"
          :key="item.surface"
          class="global-navigation__item"
          :class="{ 'global-navigation__item--active': item.isActive }"
          type="button"
          :disabled="!item.isEnabled"
          :title="item.disabledReason || item.description"
          @click="emit('navigate', item.surface)"
        >
          <span>{{ item.label }}</span>
        </button>
      </div>

      <div class="global-navigation__status">
        <span
          class="global-navigation__status-pill"
          :class="`global-navigation__status-pill--${state.context.catalogStatus}`"
        >
          catalog {{ state.context.catalogStatus }}
        </span>
        <span
          class="global-navigation__status-pill"
          :class="`global-navigation__status-pill--${state.context.sessionStatus}`"
        >
          session {{ state.context.sessionStatus }}
        </span>
        <button
          class="global-navigation__command-button"
          type="button"
          aria-controls="global-command-center"
          :aria-expanded="isCommandCenterOpen"
          @click="emit('toggleCommandCenter')"
        >
          Command Center
        </button>
      </div>
    </nav>
  </header>

  <Teleport to="body">
    <div
      v-if="isCommandCenterOpen"
      class="command-center-backdrop"
      @click.self="emit('closeCommandCenter')"
    >
      <section
        id="global-command-center"
        class="command-center"
        role="dialog"
        aria-modal="true"
        aria-label="Command Center"
      >
        <header class="command-center__header">
          <div>
            <span class="global-navigation__eyebrow">Command Center</span>
            <h2>Command Center</h2>
            <p>{{ props.state.context.primaryLabel }}</p>
          </div>
          <button
            class="command-center__close"
            type="button"
            aria-label="Закрыть Command Center"
            @click="emit('closeCommandCenter')"
          >
            Закрыть
          </button>
        </header>

        <div class="command-center__context">
          <span>catalog: {{ state.context.catalogSource }}</span>
          <span>session: {{ state.context.sessionSource }}</span>
        </div>

        <section
          v-for="group in state.commandGroups"
          :key="group.title"
          class="command-center__group"
        >
          <h3>{{ group.title }}</h3>
          <div class="command-center__commands">
            <button
              v-for="command in group.commands"
              :key="command.id"
              class="command-center__command"
              type="button"
              :disabled="!command.isEnabled"
              :aria-label="command.label"
              :title="command.disabledReason || command.description"
              @click="executeCommand(command)"
            >
              <span>{{ commandStateLabel(command) }}</span>
              <code v-if="command.kind === 'copy' && command.value">{{ command.value }}</code>
              <small v-else>{{ command.description }}</small>
            </button>
          </div>
        </section>
      </section>
    </div>
  </Teleport>
</template>
