<script setup lang="ts">
import type { AcademyStage } from '~/core/session/domain/academy-session'
import Panel from '~/components/shared/ui/Panel.vue'

defineProps<{
  stages: AcademyStage[]
}>()
</script>

<template>
  <Panel class="timeline-panel" eyebrow="timeline" title="Лента занятия">
    <ol class="timeline">
      <li v-for="stage in stages" :key="stage.code">
        <span>{{ stage.timebox }}</span>
        <strong>{{ stage.title }}</strong>
        <p>{{ stage.student_action }}</p>
      </li>
    </ol>
  </Panel>
</template>
