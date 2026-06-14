<script setup lang="ts">
import { computed } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import type { MentorCockpitState } from './mentor-cockpit-state'

interface EvidenceSession extends AcademySession {
  intervention_flags?: string[]
}

const props = defineProps<{
  session: EvidenceSession
  state: MentorCockpitState
}>()

const interventionFlags = computed(() => props.session.intervention_flags ?? [])
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
      <strong>{{ interventionFlags.length ? interventionFlags.join(', ') : 'нет' }}</strong>
    </div>
  </section>
</template>
