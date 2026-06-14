<script setup lang="ts">
import Panel from '~/components/shared/ui/Panel.vue'

const checks = [
  'Ученик отличает QD, QE, gang, slice и Motion.',
  'Ученик объясняет, почему distribution key не равен partition key.',
  'Ученик показывает Heap/AO/AOCO через DDL и catalog checks.',
  'Submission проходит mentor-lab.py autograde-sql.',
  'Generated dataset готовится через mentor-lab.py dataset.'
]
</script>

<template>
  <Panel class="evidence-panel" eyebrow="evidence" title="Проверка понимания">
    <ul>
      <li v-for="check in checks" :key="check">{{ check }}</li>
    </ul>
  </Panel>
</template>
