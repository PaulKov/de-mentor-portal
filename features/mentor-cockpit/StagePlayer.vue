<script setup lang="ts">
import { computed } from 'vue'
import type { MentorCockpitState } from './mentor-cockpit-state'

const props = defineProps<{
  state: MentorCockpitState
}>()

const emit = defineEmits<{
  selectStage: [stageCode: string]
}>()

const activeIndex = computed(() =>
  props.state.stages.findIndex(stage => stage.code === props.state.selectedStage.code)
)

const previousStage = computed(() => props.state.stages[activeIndex.value - 1])
const nextStage = computed(() => props.state.stages[activeIndex.value + 1])
</script>

<template>
  <section id="current-stage" class="stage-player panel" aria-label="Stage player">
    <aside class="stage-player__rail" aria-label="Этапы маршрута">
      <button
        v-for="stage in state.stages"
        :key="stage.code"
        type="button"
        class="stage-player__stage"
        :class="{ active: stage.code === state.selectedStage.code }"
        @click="emit('selectStage', stage.code)"
      >
        <span>{{ stage.timebox }}</span>
        {{ stage.title }}
      </button>
    </aside>

    <article class="stage-player__body">
      <div>
        <p class="muted">stage player · {{ state.slideLabel }}</p>
        <h2>{{ state.selectedStage.title }}</h2>
        <p>{{ state.selectedGuide?.mentor_script || state.selectedStage.mentor_focus }}</p>
      </div>

      <dl class="stage-brief">
        <div>
          <dt>Вопрос ученику</dt>
          <dd>{{ state.selectedGuide?.question || 'Попросить ученика объяснить ход решения своими словами.' }}</dd>
        </div>
        <div>
          <dt>Ожидаемый ответ</dt>
          <dd>{{ state.selectedGuide?.expected_answer || state.selectedStage.success_signal }}</dd>
        </div>
        <div>
          <dt>Проверка</dt>
          <dd>{{ state.selectedGuide?.verification || state.selectedStage.success_signal }}</dd>
        </div>
      </dl>

      <div class="stage-player__actions">
        <button
          type="button"
          class="quiet-button"
          :disabled="!previousStage"
          @click="previousStage && emit('selectStage', previousStage.code)"
        >
          Назад
        </button>
        <button
          type="button"
          class="quiet-button"
          :disabled="!nextStage"
          @click="nextStage && emit('selectStage', nextStage.code)"
        >
          Далее
        </button>
      </div>
    </article>
  </section>
</template>
