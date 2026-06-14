<script setup lang="ts">
import type { ValidationIssue } from '~/core/session/application/session-contract'
import Panel from '~/components/shared/ui/Panel.vue'
import StatusBadge from '~/components/shared/ui/StatusBadge.vue'

defineProps<{
  isValid: boolean
  source: string
  issues: ValidationIssue[]
}>()

defineEmits<{
  reload: []
}>()
</script>

<template>
  <Panel class="status-panel" eyebrow="session state" title="Контракт сессии">
    <div class="status-row">
      <StatusBadge :tone="isValid ? 'success' : 'warning'">
        {{ isValid ? 'валиден' : 'нужна проверка' }}
      </StatusBadge>
      <span>{{ source }}</span>
      <button class="quiet-button" type="button" @click="$emit('reload')">
        Обновить state
      </button>
    </div>

    <ul v-if="issues.length" class="issue-list">
      <li v-for="issue in issues" :key="`${issue.path}:${issue.message}`">
        <code>{{ issue.path }}</code>
        {{ issue.message }}
      </li>
    </ul>
  </Panel>
</template>
