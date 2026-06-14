<script setup lang="ts">
import type { AcademySession } from '~/core/session/domain/academy-session'
import type { MentorCockpitState } from './mentor-cockpit-state'

defineProps<{
  session: AcademySession
  state: MentorCockpitState
}>()
</script>

<template>
  <section class="evidence-cockpit-panel panel" aria-label="Evidence panel">
    <div class="panel-heading">
      <p class="muted">evidence panel</p>
      <h2>Доказательства понимания</h2>
    </div>

    <ul class="evidence-cockpit-list">
      <li v-for="item in state.evidenceItems" :key="item.title">
        <strong>{{ item.title }}</strong>
        <span>{{ item.evidence }}</span>
      </li>
    </ul>

    <div class="intervention-box">
      <span>Сигнал вмешательства</span>
      <strong>{{ session.intervention_flags.length ? session.intervention_flags.join(', ') : 'нет' }}</strong>
    </div>
  </section>
</template>
