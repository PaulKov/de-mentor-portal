<script setup lang="ts">
import { toRef } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import AppShell from '~/components/shared/ui/AppShell.vue'
import CopyButton from '~/components/shared/ui/CopyButton.vue'
import StatusBadge from '~/components/shared/ui/StatusBadge.vue'
import { useReviewCenterState } from './useReviewCenterState'

const props = defineProps<{
  session: AcademySession
  source: string
  canOpenHub?: boolean
  canOpenWorkspace?: boolean
}>()

const emit = defineEmits<{
  'open-hub': []
  'open-workspace': []
  'open-session': []
}>()

const sessionRef = toRef(props, 'session')
const { exportJson, hydrate, reportMarkdown, reviewState } = useReviewCenterState(sessionRef)

const scoreTone = () => reviewState.value.evidenceScore.percent >= 80 ? 'success' : 'warning'
</script>

<template>
  <AppShell
    :stages="session.stages"
    :current-stage-code="session.current_stage.code"
    :framework="session.portal.framework"
    :source="source"
  >
    <template #portal-actions>
      <button
        v-if="canOpenHub"
        class="quiet-button portal-action-button"
        type="button"
        @click="emit('open-hub')"
      >
        Вернуться в каталог
      </button>
      <button
        v-if="canOpenWorkspace"
        class="quiet-button portal-action-button"
        type="button"
        @click="emit('open-workspace')"
      >
        Открыть сессии
      </button>
      <button class="quiet-button portal-action-button" type="button" @click="emit('open-session')">
        Вернуться в cockpit
      </button>
    </template>

    <header class="topbar review-topbar">
      <div>
        <p class="muted">mentor review</p>
        <h1>Mentor Review Center</h1>
        <p>{{ reviewState.title }}</p>
      </div>
      <div class="review-topbar-actions">
        <StatusBadge :tone="scoreTone()">
          {{ reviewState.evidenceScore.percent }}% evidence
        </StatusBadge>
        <button class="quiet-button" type="button" @click="hydrate">
          Обновить review
        </button>
      </div>
    </header>

    <section id="current-stage" class="review-score-panel" aria-label="Итог урока">
      <div>
        <p class="muted">evidence score</p>
        <strong>
          {{ reviewState.evidenceScore.checked }}/{{ reviewState.evidenceScore.total }}
        </strong>
        <span>{{ reviewState.evidenceScore.percent }}%</span>
      </div>
      <div>
        <p class="muted">next lesson</p>
        <h2>{{ reviewState.nextLesson?.title || 'Следующий урок не задан' }}</h2>
        <p>{{ reviewState.nextLesson?.path || 'Добавьте next_lesson в session control_plane.' }}</p>
      </div>
    </section>

    <div class="review-grid">
      <section class="review-stage-list" aria-label="Stage review">
        <article
          v-for="stage in reviewState.stageSummaries"
          :key="stage.code"
          class="review-stage-card"
        >
          <div>
            <p class="muted">{{ stage.timebox }}</p>
            <h2>{{ stage.title }}</h2>
          </div>
          <StatusBadge :tone="stage.reviewStatus === 'reviewed' ? 'success' : 'warning'">
            {{ stage.reviewStatus }}
          </StatusBadge>
          <p v-if="stage.question"><strong>Вопрос:</strong> {{ stage.question }}</p>
          <p><strong>Заметка:</strong> {{ stage.note || 'Заметка ментора пока не заполнена.' }}</p>
          <p v-if="stage.verification"><strong>Проверка:</strong> {{ stage.verification }}</p>
        </article>
      </section>

      <aside class="review-signal-rail" aria-label="Signals and next steps">
        <section class="review-signal-card">
          <p class="muted">strengths</p>
          <h2>Сильные сигналы</h2>
          <ul>
            <li v-for="item in reviewState.strengths" :key="item">{{ item }}</li>
            <li v-if="reviewState.strengths.length === 0">Evidence еще не подтвержден.</li>
          </ul>
        </section>

        <section class="review-signal-card">
          <p class="muted">risks</p>
          <h2>Риски</h2>
          <ul>
            <li v-for="item in reviewState.risks" :key="item">{{ item }}</li>
            <li v-if="reviewState.risks.length === 0">Открытых рисков нет.</li>
          </ul>
        </section>

        <section class="review-signal-card">
          <p class="muted">next steps</p>
          <h2>Что дать ученику</h2>
          <ul>
            <li v-for="item in reviewState.recommendations" :key="item">{{ item }}</li>
            <li v-if="reviewState.recommendations.length === 0">
              Зафиксировать отчет и перейти к следующему уроку.
            </li>
          </ul>
        </section>
      </aside>
    </div>

    <section class="review-export-panel" aria-label="Handoff report">
      <div class="review-export-heading">
        <div>
          <p class="muted">handoff</p>
          <h2>Отчет после урока</h2>
        </div>
        <div class="review-export-actions">
          <CopyButton :text="reportMarkdown" label="Копировать Markdown" />
          <CopyButton :text="exportJson" label="Копировать JSON" />
        </div>
      </div>
      <textarea :value="reportMarkdown" readonly aria-label="Markdown report" />
    </section>
  </AppShell>
</template>
