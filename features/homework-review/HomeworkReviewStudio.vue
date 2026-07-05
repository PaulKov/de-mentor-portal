<script setup lang="ts">
import { computed, toRef, ref } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import CopyCommand from '~/components/shared/ui/CopyCommand.vue'
import { copyTextToClipboard } from '~/shared/utils/clipboard'
import { useHomeworkReviewState } from './useHomeworkReviewState'

const props = defineProps<{
  session: AcademySession
}>()

const sessionRef = toRef(props, 'session')
const {
  reviewState,
  markNextPlanSent,
  selectRubric,
  setFlag,
  toggleChecklist,
  toggleRubric,
  updateConclusionText,
  updateNotes
} = useHomeworkReviewState(sessionRef)

const studioState = computed(() => reviewState.value.available ? reviewState.value : null)
const handoffCopyFailed = ref(false)

const checkedFromEvent = (event: Event) =>
  event.target instanceof HTMLInputElement && event.target.checked

const textFromEvent = (event: Event) =>
  event.target instanceof HTMLTextAreaElement ? event.target.value : ''

const sendNextLessonPlan = async () => {
  if (!studioState.value) {
    return
  }

  try {
    await copyTextToClipboard(studioState.value.nextPlanMarkdown)
    handoffCopyFailed.value = false
  } catch {
    handoffCopyFailed.value = true
  }
  markNextPlanSent()
}
</script>

<template>
  <section
    v-if="studioState"
    class="homework-review-studio"
    aria-label="Homework Review Studio"
  >
    <header class="homework-review-header">
      <div>
        <p class="muted">Live Homework Walkthrough</p>
        <h2>Разбор домашки</h2>
        <p>{{ studioState.title }}</p>
      </div>
      <dl class="homework-review-metrics" aria-label="Homework review metrics">
        <div>
          <dt>Статус</dt>
          <dd>{{ studioState.statusLabel }}</dd>
        </div>
        <div>
          <dt>Score</dt>
          <dd>{{ studioState.scoreLabel }}</dd>
        </div>
        <div>
          <dt>Decision</dt>
          <dd>{{ studioState.acceptanceLabel }}</dd>
        </div>
      </dl>
    </header>

    <div class="homework-review-grid">
      <aside class="homework-review-panel homework-review-rubric" aria-label="Rubric Lesson 01">
        <div class="homework-review-panel__header">
          <div>
            <p class="muted">Rubric Lesson 01</p>
            <h3>{{ studioState.rubricProgress.checked }}/{{ studioState.rubricProgress.total }}</h3>
          </div>
          <span>{{ studioState.missingEvidence.length }} gaps</span>
        </div>

        <ul class="homework-review-rubric__list">
          <li
            v-for="item in studioState.rubricItems"
            :key="item.code"
            class="homework-review-rubric__item"
          >
            <label class="homework-review-check">
              <input
                type="checkbox"
                :checked="studioState.localState.checkedRubric.includes(item.code)"
                @change="toggleRubric(item.code, checkedFromEvent($event))"
              >
              <span>{{ item.title }}</span>
            </label>
            <button
              class="homework-review-rubric__button"
              type="button"
              :aria-pressed="studioState.selectedRubric.code === item.code"
              @click="selectRubric(item.code)"
            >
              {{ item.title }}
              <span>{{ item.score }}/100</span>
            </button>
          </li>
        </ul>
      </aside>

      <article class="homework-review-panel homework-review-detail">
        <div class="homework-review-panel__header">
          <div>
            <p class="muted">Selected rubric item</p>
            <h3>{{ studioState.selectedRubric.title }}</h3>
          </div>
          <span>{{ studioState.selectedRubric.passed ? 'passed' : 'gap' }}</span>
        </div>

        <dl class="homework-review-detail__facts">
          <div>
            <dt>Expected evidence</dt>
            <dd>{{ studioState.selectedRubric.expected_evidence }}</dd>
          </div>
          <div>
            <dt>Mentor prompt</dt>
            <dd>{{ studioState.selectedRubric.mentor_prompt }}</dd>
          </div>
          <div>
            <dt>Conclusion hint</dt>
            <dd>{{ studioState.selectedRubric.conclusion_hint }}</dd>
          </div>
        </dl>

        <label class="homework-review-textarea">
          <span>Live notes</span>
          <textarea
            :value="studioState.localState.notes"
            rows="5"
            @input="updateNotes(textFromEvent($event))"
          />
        </label>

        <div class="homework-review-live-checklist" aria-label="Live checklist">
          <div class="homework-review-panel__header">
            <p class="muted">Live checklist</p>
            <span>{{ studioState.checklistProgress.checked }}/{{ studioState.checklistProgress.total }}</span>
          </div>
          <label
            v-for="item in studioState.liveChecklist"
            :key="item.code"
            class="homework-review-check"
          >
            <input
              type="checkbox"
              :checked="studioState.localState.checkedChecklist.includes(item.code)"
              @change="toggleChecklist(item.code, checkedFromEvent($event))"
            >
            <span>{{ item.label }}</span>
          </label>
        </div>
      </article>

      <aside class="homework-review-panel homework-review-snippets" aria-label="SQL snippets">
        <div class="homework-review-panel__header">
          <div>
            <p class="muted">SQL snippets</p>
            <h3>Команды разбора</h3>
          </div>
          <span>{{ studioState.sqlSnippets.length }}</span>
        </div>
        <div class="homework-review-snippets__list">
          <div
            v-for="snippet in studioState.sqlSnippets"
            :key="snippet.title"
            class="homework-review-snippet"
          >
            <CopyCommand :title="snippet.title" :command="snippet.command" />
            <p>{{ snippet.explanation }}</p>
          </div>
        </div>
      </aside>
    </div>

    <footer class="homework-review-footer">
      <section class="homework-review-panel homework-review-conclusion">
        <div class="homework-review-panel__header">
          <div>
            <p class="muted">Mentor conclusion</p>
            <h3>{{ studioState.mentorSummary }}</h3>
          </div>
        </div>
        <p>{{ studioState.mentorRecommendation }}</p>
        <label class="homework-review-textarea">
          <span>Mentor conclusion</span>
          <textarea
            :value="studioState.localState.conclusionText"
            rows="4"
            @input="updateConclusionText(textFromEvent($event))"
          />
        </label>
        <div class="homework-review-flags" aria-label="Homework review flags">
          <label class="homework-review-check">
            <input
              type="checkbox"
              :checked="studioState.localState.flags.needs_follow_up"
              @change="setFlag('needs_follow_up', checkedFromEvent($event))"
            >
            <span>Нужен follow-up</span>
          </label>
          <label class="homework-review-check">
            <input
              type="checkbox"
              :checked="studioState.localState.flags.ready_for_lesson_02"
              @change="setFlag('ready_for_lesson_02', checkedFromEvent($event))"
            >
            <span>Готов к Lesson 02</span>
          </label>
        </div>
      </section>

      <section class="homework-review-panel homework-review-next-plan">
        <div class="homework-review-panel__header">
          <div>
            <p class="muted">Next lesson plan</p>
            <h3>Lesson 02 handoff</h3>
          </div>
          <span v-if="studioState.localState.flags.next_plan_sent">План Lesson 02 отмечен</span>
        </div>
        <textarea
          class="homework-review-next-plan__text"
          aria-label="Lesson 02 plan"
          readonly
          :value="studioState.nextPlanMarkdown"
          rows="8"
        />
        <button
          class="primary-button homework-review-next-plan__button"
          type="button"
          @click="sendNextLessonPlan"
        >
          Отправить в план Lesson 02
        </button>
        <p v-if="handoffCopyFailed" class="muted">
          Clipboard API недоступен, план оставлен на экране для ручного копирования.
        </p>
      </section>
    </footer>
  </section>
</template>
