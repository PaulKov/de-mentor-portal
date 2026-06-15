<script setup lang="ts">
import { computed, toRef } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import type { MentorCockpitState } from '~/features/mentor-cockpit/mentor-cockpit-state'
import { useDeliveryControlRoomState } from './useDeliveryControlRoomState'

const props = defineProps<{
  session: AcademySession
  state: MentorCockpitState
  checkedEvidence: string[]
  stageNote: string
}>()

const emit = defineEmits<{
  toggleEvidence: [title: string, checked: boolean]
  updateStageNote: [note: string]
}>()

const sessionRef = toRef(props, 'session')
const stateRef = toRef(props, 'state')
const {
  controlRoomState,
  pauseTimer,
  resetTimer,
  setPanicMode,
  startTimer
} = useDeliveryControlRoomState(sessionRef, stateRef)

const plannedLabel = computed(() =>
  `${controlRoomState.value.remainingLabel === '00:00'
    ? controlRoomState.value.timerLabel
    : formatPlanned(controlRoomState.value.plannedSeconds)} planned`
)
const evidenceIsChecked = computed(() =>
  props.checkedEvidence.includes(controlRoomState.value.evidenceAction?.title ?? '')
)

const togglePrimaryEvidence = () => {
  const evidenceAction = controlRoomState.value.evidenceAction
  if (evidenceAction) {
    emit('toggleEvidence', evidenceAction.title, true)
  }
}

const updateNote = (event: Event) => {
  emit('updateStageNote', (event.target as HTMLTextAreaElement).value)
}

const formatPlanned = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60

  return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`
}
</script>

<template>
  <section class="delivery-room panel" aria-label="Lesson delivery control room">
    <header class="delivery-room__header">
      <div>
        <p class="muted">lesson delivery control room</p>
        <h2>Фокус проведения урока</h2>
        <span>{{ controlRoomState.stageIndexLabel }}</span>
      </div>
      <div class="delivery-room__timer">
        <strong>{{ controlRoomState.timerLabel }}</strong>
        <span>{{ plannedLabel }}</span>
        <span>remaining {{ controlRoomState.remainingLabel }}</span>
      </div>
    </header>

    <div class="delivery-room__progress" aria-label="Stage timer progress">
      <span :style="{ width: `${controlRoomState.progressPercent}%` }" />
    </div>

    <div class="delivery-room__timer-actions">
      <button
        v-if="controlRoomState.timerStatusLabel !== 'running'"
        class="quiet-button"
        type="button"
        @click="startTimer"
      >
        Start timer
      </button>
      <button
        v-else
        class="quiet-button"
        type="button"
        @click="pauseTimer"
      >
        Pause timer
      </button>
      <button class="quiet-button" type="button" @click="resetTimer">
        Reset timer
      </button>
    </div>

    <div class="delivery-room__grid">
      <article
        v-for="card in controlRoomState.focusCards"
        :key="card.label"
        class="delivery-room__focus-card"
      >
        <span>{{ card.label }}</span>
        <p>{{ card.body }}</p>
      </article>
    </div>

    <div class="delivery-room__quick-actions">
      <button
        v-if="controlRoomState.evidenceAction"
        class="quiet-button"
        type="button"
        :disabled="evidenceIsChecked"
        @click="togglePrimaryEvidence"
      >
        {{ controlRoomState.evidenceAction.label }}
      </button>

      <label class="delivery-room__note">
        <span>Control room note</span>
        <textarea
          aria-label="Control room note"
          :value="stageNote"
          placeholder="Короткая заметка прямо во время stage."
          @input="updateNote"
        />
      </label>
    </div>

    <section class="delivery-room__panic" aria-label="Panic mode">
      <div class="delivery-room__panic-buttons">
        <button
          v-for="guide in controlRoomState.panicGuides"
          :key="guide.mode"
          class="quiet-button"
          type="button"
          @click="setPanicMode(guide.mode)"
        >
          {{ guide.title }}
        </button>
      </div>
      <article v-if="controlRoomState.activePanicGuide" class="delivery-room__panic-guide">
        <strong>{{ controlRoomState.activePanicGuide.action }}</strong>
        <p>{{ controlRoomState.activePanicGuide.detail }}</p>
      </article>
    </section>
  </section>
</template>
