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
  checkedEvidence: string[]
  stageNote: string
}>()

const emit = defineEmits<{
  toggleEvidence: [title: string, checked: boolean]
  updateStageNote: [note: string]
}>()

const interventionFlags = computed(() => props.session.intervention_flags ?? [])

const handleEvidenceChange = (title: string, event: Event) => {
  emit('toggleEvidence', title, (event.target as HTMLInputElement).checked)
}

const handleNoteInput = (event: Event) => {
  emit('updateStageNote', (event.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <section class="evidence-cockpit-panel panel" aria-label="Evidence panel">
    <div class="panel-heading">
      <p class="muted">evidence panel</p>
      <h2>Доказательства понимания</h2>
    </div>

    <ul class="evidence-cockpit-list">
      <li v-for="item in state.evidenceItems" :key="item.title">
        <label class="evidence-check">
          <input
            type="checkbox"
            :checked="checkedEvidence.includes(item.title)"
            @change="handleEvidenceChange(item.title, $event)"
          >
          <span>
            <strong>{{ item.title }}</strong>
            <span>{{ item.evidence }}</span>
          </span>
        </label>
      </li>
    </ul>

    <label class="stage-note">
      <span>Заметка ментора</span>
      <textarea
        aria-label="Заметка по этапу"
        :value="stageNote"
        placeholder="Что ученик понял, где нужна помощь, что принести на следующий урок."
        @input="handleNoteInput"
      />
    </label>

    <div class="intervention-box">
      <span>Сигнал вмешательства</span>
      <strong>{{ interventionFlags.length ? interventionFlags.join(', ') : 'нет' }}</strong>
    </div>
  </section>
</template>
