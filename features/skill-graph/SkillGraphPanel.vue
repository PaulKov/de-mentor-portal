<script setup lang="ts">
import type { SkillNode } from '~/core/session/domain/academy-session'
import Panel from '~/components/shared/ui/Panel.vue'

defineProps<{
  nodes: SkillNode[]
}>()
</script>

<template>
  <Panel class="skill-graph" eyebrow="skill graph" title="Карта навыков">
    <div class="skill-list">
      <article v-for="node in nodes" :key="node.code" class="skill-node">
        <span>{{ node.level }}</span>
        <strong>{{ node.title }}</strong>
        <p>{{ node.evidence }}</p>
      </article>
    </div>
  </Panel>
</template>
