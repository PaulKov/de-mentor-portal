<script setup lang="ts">
import { toRef } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import type { EvidenceLedgerStageStatus } from './evidence-ledger-state'
import { useEvidenceLedgerState } from './useEvidenceLedgerState'

const props = defineProps<{
  session: AcademySession
  checkedEvidence: string[]
  notesByStage: Record<string, string>
}>()

const statusOptions: Array<{ value: EvidenceLedgerStageStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'done', label: 'Done' },
  { value: 'risk', label: 'Risk' },
  { value: 'skipped', label: 'Skipped' }
]

const sessionRef = toRef(props, 'session')
const checkedEvidenceRef = toRef(props, 'checkedEvidence')
const notesByStageRef = toRef(props, 'notesByStage')
const {
  ledgerState,
  resetStageLedger,
  setActualMinutes,
  setBlocker,
  setStageStatus
} = useEvidenceLedgerState(sessionRef, checkedEvidenceRef, notesByStageRef)

const updateActualMinutes = (stageCode: string, event: Event) => {
  setActualMinutes(stageCode, Number((event.target as HTMLInputElement).value))
}

const updateBlocker = (stageCode: string, event: Event) => {
  setBlocker(stageCode, (event.target as HTMLInputElement).value)
}
</script>

<template>
  <section class="evidence-ledger panel" aria-label="Lesson run evidence ledger">
    <header class="evidence-ledger__header">
      <div>
        <p class="muted">lesson run ledger</p>
        <h2>Lesson Run Evidence Ledger</h2>
        <p>{{ ledgerState.title }}</p>
      </div>
      <div class="evidence-ledger__summary" aria-label="Ledger summary">
        <strong>{{ ledgerState.summary.done }}/{{ ledgerState.summary.total }} done</strong>
        <span>{{ ledgerState.summary.evidenceChecked }}/{{ ledgerState.summary.evidenceTotal }} evidence</span>
        <span>{{ ledgerState.summary.actualMinutes }} min actual</span>
        <span>{{ ledgerState.summary.deltaMinutes >= 0 ? '+' : '' }}{{ ledgerState.summary.deltaMinutes }} min delta</span>
      </div>
    </header>

    <div class="evidence-ledger__rows">
      <article
        v-for="row in ledgerState.rows"
        :key="row.code"
        class="evidence-ledger__row"
      >
        <div class="evidence-ledger__stage">
          <span>{{ row.timebox }}</span>
          <strong>{{ row.title }}</strong>
          <p>{{ row.question ?? row.verification ?? 'No guide attached.' }}</p>
        </div>

        <div class="evidence-ledger__status" :aria-label="`Status for ${row.title}`">
          <button
            v-for="option in statusOptions"
            :key="option.value"
            class="quiet-button"
            type="button"
            :aria-label="`Set ${row.title} ${option.value}`"
            :aria-pressed="row.status === option.value"
            @click="setStageStatus(row.code, option.value)"
          >
            {{ option.label }}
          </button>
        </div>

        <label class="evidence-ledger__field">
          <span>Actual minutes</span>
          <input
            :aria-label="`Actual minutes for ${row.title}`"
            min="0"
            max="240"
            type="number"
            :value="row.actualMinutes"
            @input="updateActualMinutes(row.code, $event)"
          >
        </label>

        <div class="evidence-ledger__signals">
          <span>planned {{ row.plannedMinutes }} min</span>
          <span>evidence {{ row.evidenceChecked }}/{{ row.evidenceTotal }}</span>
          <span>{{ row.note ? 'note captured' : 'no note' }}</span>
        </div>

        <label class="evidence-ledger__field evidence-ledger__blocker">
          <span>Blocker</span>
          <input
            :aria-label="`Blocker for ${row.title}`"
            placeholder="Короткий blocker или follow-up."
            type="text"
            :value="row.blocker"
            @input="updateBlocker(row.code, $event)"
          >
        </label>

        <button
          class="quiet-button evidence-ledger__reset"
          type="button"
          @click="resetStageLedger(row.code)"
        >
          Reset
        </button>
      </article>
    </div>

    <label class="evidence-ledger__markdown">
      <span>Lesson ledger markdown</span>
      <textarea
        aria-label="Lesson ledger markdown"
        readonly
        :value="ledgerState.handoffMarkdown"
      />
    </label>
  </section>
</template>
