<script setup lang="ts">
import { computed, toRef } from 'vue'
import type { AcademyCatalog } from '~/core/catalog/domain/academy-catalog'
import StatusBadge from '~/components/shared/ui/StatusBadge.vue'
import { useLessonAuthoringState } from './useLessonAuthoringState'

const props = defineProps<{
  catalog: AcademyCatalog
  catalogSource: string
  canOpenHub?: boolean
  canOpenRelease?: boolean
}>()

const emit = defineEmits<{
  'open-hub': []
  'open-release': []
}>()

const catalogRef = toRef(props, 'catalog')
const {
  authoringState,
  resetDraft,
  selectLesson,
  selectTrack,
  updateDraft,
  updateStage
} = useLessonAuthoringState(catalogRef)

const blockerCount = computed(() =>
  authoringState.value.qualityChecks.filter(check => check.severity === 'blocker').length
)
const warningCount = computed(() =>
  authoringState.value.qualityChecks.filter(check => check.severity === 'warning').length
)
const readinessTone = computed(() =>
  authoringState.value.readiness === 'ready' ? 'success' : 'warning'
)

const updateText = (field: 'title' | 'objective', event: Event) => {
  updateDraft({ [field]: readValue(event) })
}

const updateTotalMinutes = (event: Event) => {
  updateDraft({ totalMinutes: Number(readValue(event)) })
}

const updateStageText = (
  index: number,
  field: 'title' | 'mentorAction' | 'studentAction' | 'command' | 'question' | 'evidence',
  event: Event
) => {
  updateStage(index, field, readValue(event))
}

const updateStageDuration = (index: number, event: Event) => {
  updateStage(index, 'durationMinutes', Number(readValue(event)))
}

const updateHomework = (index: number, event: Event) => {
  const homeworkTasks = [...authoringState.value.draft.homeworkTasks]
  homeworkTasks[index] = readValue(event)
  updateDraft({ homeworkTasks })
}

const copyText = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    // Clipboard is optional; textareas remain available for manual copy.
  }
}

const readValue = (event: Event) =>
  event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
    ? event.target.value
    : ''
</script>

<template>
  <main class="authoring-shell">
    <header class="authoring-topbar">
      <div>
        <p class="muted">lesson factory</p>
        <h1>Lesson Authoring Studio</h1>
        <p>{{ authoringState.subtitle }} · {{ catalogSource }}</p>
      </div>
      <div class="authoring-topbar-actions">
        <StatusBadge :tone="readinessTone">
          {{ authoringState.readiness }}
        </StatusBadge>
        <strong>{{ authoringState.readinessScore }}%</strong>
        <button class="quiet-button" type="button" @click="resetDraft">
          Сбросить draft
        </button>
        <button
          v-if="canOpenHub"
          class="quiet-button"
          type="button"
          @click="emit('open-hub')"
        >
          Lesson Hub
        </button>
        <button
          v-if="canOpenRelease"
          class="quiet-button"
          type="button"
          @click="emit('open-release')"
        >
          Release Console
        </button>
      </div>
    </header>

    <section class="authoring-selectors" aria-label="Authoring lesson selectors">
      <div>
        <p class="muted">tracks</p>
        <div class="authoring-button-row">
          <button
            v-for="track in catalog.tracks"
            :key="track.code"
            class="quiet-button"
            type="button"
            :aria-pressed="track.code === authoringState.selectedTrack.code"
            @click="selectTrack(track.code)"
          >
            {{ track.title }}
          </button>
        </div>
      </div>
      <div>
        <p class="muted">lessons</p>
        <div class="authoring-button-row">
          <button
            v-for="lesson in authoringState.selectedTrack.lessons"
            :key="lesson.code"
            class="quiet-button"
            type="button"
            :aria-pressed="lesson.code === authoringState.selectedLesson.code"
            @click="selectLesson(lesson.code)"
          >
            {{ lesson.title }}
          </button>
        </div>
      </div>
    </section>

    <section class="authoring-blueprint" aria-label="Authoring blueprint">
      <div>
        <p class="muted">blueprint</p>
        <h2>{{ authoringState.title }}</h2>
        <p>{{ authoringState.blueprint.objective }}</p>
      </div>
      <div class="authoring-metrics">
        <article>
          <span>{{ authoringState.blueprint.totalMinutes }}</span>
          <p>minutes</p>
        </article>
        <article>
          <span>{{ authoringState.blueprint.stageCount }}</span>
          <p>stages</p>
        </article>
        <article>
          <span>{{ blockerCount }}</span>
          <p>blockers</p>
        </article>
        <article>
          <span>{{ warningCount }}</span>
          <p>warnings</p>
        </article>
      </div>
      <label>
        Lesson title
        <input
          :value="authoringState.draft.title"
          type="text"
          aria-label="Lesson title"
          @input="updateText('title', $event)"
        >
      </label>
      <label>
        Objective
        <textarea
          :value="authoringState.draft.objective"
          aria-label="Lesson objective"
          @input="updateText('objective', $event)"
        />
      </label>
      <label>
        Total minutes
        <input
          :value="authoringState.draft.totalMinutes"
          type="number"
          min="0"
          aria-label="Total minutes"
          @input="updateTotalMinutes"
        >
      </label>
    </section>

    <section class="authoring-stage-matrix" aria-label="Authoring stage matrix">
      <div class="authoring-section-head">
        <div>
          <p class="muted">stage matrix</p>
          <h2>Этапы урока</h2>
        </div>
      </div>
      <article
        v-for="(row, index) in authoringState.stageRows"
        :key="row.code"
        class="authoring-stage-card"
      >
        <div class="authoring-stage-card__head">
          <strong>{{ row.index }}. {{ row.title }}</strong>
          <span>{{ row.durationLabel }}</span>
        </div>
        <div class="authoring-stage-fields">
          <label>
            Stage title
            <input
              :value="row.title"
              type="text"
              :aria-label="`Stage ${row.index} title`"
              @input="updateStageText(index, 'title', $event)"
            >
          </label>
          <label>
            Minutes
            <input
              :value="row.durationMinutes"
              type="number"
              min="0"
              :aria-label="`Stage ${row.index} minutes`"
              @input="updateStageDuration(index, $event)"
            >
          </label>
          <label>
            Mentor action
            <textarea
              :value="row.mentorAction"
              :aria-label="`Stage ${row.index} mentor action`"
              @input="updateStageText(index, 'mentorAction', $event)"
            />
          </label>
          <label>
            Student action
            <textarea
              :value="row.studentAction"
              :aria-label="`Stage ${row.index} student action`"
              @input="updateStageText(index, 'studentAction', $event)"
            />
          </label>
          <label>
            Command
            <textarea
              :value="row.command"
              :aria-label="`Stage ${row.index} command`"
              @input="updateStageText(index, 'command', $event)"
            />
          </label>
          <label>
            Question
            <textarea
              :value="row.question"
              :aria-label="`Stage ${row.index} question`"
              @input="updateStageText(index, 'question', $event)"
            />
          </label>
          <label>
            Evidence
            <textarea
              :value="row.evidence"
              :aria-label="`Stage ${row.index} evidence`"
              @input="updateStageText(index, 'evidence', $event)"
            />
          </label>
        </div>
      </article>
    </section>

    <div class="authoring-grid">
      <section class="authoring-panel" aria-label="Authoring quality gate">
        <p class="muted">quality gate</p>
        <h2>Готовность урока</h2>
        <ul>
          <li
            v-for="check in authoringState.qualityChecks"
            :key="check.code"
            :class="`authoring-check authoring-check--${check.severity}`"
          >
            <span>{{ check.title }}</span>
            <small>{{ check.detail }}</small>
          </li>
          <li v-if="authoringState.qualityChecks.length === 0" class="authoring-check authoring-check--ok">
            <span>Blockers и warnings не найдены</span>
            <small>Урок готов к dry-run.</small>
          </li>
        </ul>
      </section>

      <section class="authoring-panel" aria-label="Authoring preview">
        <p class="muted">preview</p>
        <h2>Маршрут урока</h2>
        <h3>Mentor route</h3>
        <ol>
          <li v-for="item in authoringState.preview.mentorRoute" :key="item">
            {{ item }}
          </li>
        </ol>
        <h3>Student route</h3>
        <ol>
          <li v-for="item in authoringState.preview.studentRoute" :key="item">
            {{ item }}
          </li>
        </ol>
      </section>
    </div>

    <section class="authoring-panel" aria-label="Authoring homework">
      <p class="muted">homework</p>
      <h2>Задания ученика</h2>
      <label v-for="(task, index) in authoringState.draft.homeworkTasks" :key="index">
        Homework {{ index + 1 }}
        <textarea
          :value="task"
          :aria-label="`Homework ${index + 1}`"
          @input="updateHomework(index, $event)"
        />
      </label>
    </section>

    <section class="authoring-exports" aria-label="Authoring exports">
      <div class="authoring-section-head">
        <div>
          <p class="muted">export</p>
          <h2>Copy-ready артефакты</h2>
        </div>
        <button
          class="primary-button"
          type="button"
          @click="copyText(authoringState.exports.lessonPackageJson)"
        >
          Скопировать lesson package
        </button>
      </div>
      <label>
        Catalog patch markdown
        <textarea
          :value="authoringState.exports.catalogPatchMarkdown"
          readonly
          aria-label="Catalog patch markdown"
        />
      </label>
      <label>
        Session seed JSON
        <textarea
          :value="authoringState.exports.sessionSeedJson"
          readonly
          aria-label="Session seed JSON"
        />
      </label>
      <label>
        Quality report markdown
        <textarea
          :value="authoringState.exports.qualityReportMarkdown"
          readonly
          aria-label="Quality report markdown"
        />
      </label>
    </section>
  </main>
</template>
