<script setup lang="ts">
import { toRef } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import AppShell from '~/components/shared/ui/AppShell.vue'
import CopyButton from '~/components/shared/ui/CopyButton.vue'
import StatusBadge from '~/components/shared/ui/StatusBadge.vue'
import { useCohortDashboardState } from './useCohortDashboardState'
import type { CohortFilterStatus, LearnerStatus } from './cohort-dashboard-state'

const props = defineProps<{
  session: AcademySession
  source: string
  canOpenHub?: boolean
  canOpenWorkspace?: boolean
  canOpenSession?: boolean
  canOpenReview?: boolean
  canOpenSubmission?: boolean
}>()

const emit = defineEmits<{
  'open-hub': []
  'open-workspace': []
  'open-session': []
  'open-review': []
  'open-submission': []
}>()

const sessionRef = toRef(props, 'session')
const sourceRef = toRef(props, 'source')
const {
  cohortState,
  hydrate,
  selectStatusFilter
} = useCohortDashboardState(sessionRef, sourceRef)

const filterOptions: Array<{ label: string; value: CohortFilterStatus }> = [
  { label: 'Все', value: 'all' },
  { label: 'Риски', value: 'risks' },
  { label: 'Ready submissions', value: 'ready-submissions' }
]

const learnerLabel = () =>
  `${cohortState.value.metrics.learnerCount} ${cohortState.value.metrics.learnerCount === 1 ? 'learner' : 'learners'}`

const learnerTone = (status: LearnerStatus) =>
  status === 'needs-attention' ? 'warning' : 'success'
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
      <button
        v-if="canOpenSession"
        class="quiet-button portal-action-button"
        type="button"
        @click="emit('open-session')"
      >
        Открыть cockpit
      </button>
      <button
        v-if="canOpenReview"
        class="quiet-button portal-action-button"
        type="button"
        @click="emit('open-review')"
      >
        Открыть review
      </button>
      <button
        v-if="canOpenSubmission"
        class="quiet-button portal-action-button"
        type="button"
        @click="emit('open-submission')"
      >
        Открыть submissions
      </button>
    </template>

    <header class="topbar cohort-topbar">
      <div>
        <p class="muted">mentor operations</p>
        <h1>Cohort Progress Dashboard</h1>
        <p>Browser-local сводка по live session и imported workspace runs.</p>
      </div>
      <div class="cohort-topbar-actions">
        <button class="quiet-button" type="button" @click="hydrate">
          Обновить cohort
        </button>
        <CopyButton :text="cohortState.reportMarkdown" label="Копировать Markdown" />
      </div>
    </header>

    <section class="cohort-metrics" aria-label="Cohort metrics">
      <article>
        <span>{{ learnerLabel() }}</span>
        <p>active learners</p>
      </article>
      <article>
        <span>{{ cohortState.metrics.averageEvidencePercent }}% avg evidence</span>
        <p>по отмеченным skill evidence</p>
      </article>
      <article>
        <span>{{ cohortState.metrics.readySubmissionCount }} ready</span>
        <p>submissions готовы к review</p>
      </article>
      <article>
        <span>{{ cohortState.metrics.highRiskCount }} risk</span>
        <p>ученики с открытыми gaps</p>
      </article>
    </section>

    <section class="cohort-filter-panel" aria-label="Cohort filters">
      <button
        v-for="option in filterOptions"
        :key="option.value"
        class="quiet-button"
        type="button"
        :aria-pressed="cohortState.filters.status === option.value"
        :class="{ active: cohortState.filters.status === option.value }"
        @click="selectStatusFilter(option.value)"
      >
        {{ option.label }}
      </button>
    </section>

    <div class="cohort-grid">
      <section class="cohort-card-list" aria-label="Learner progress cards">
        <article
          v-for="card in cohortState.visibleCards"
          :key="card.id"
          class="cohort-learner-card"
        >
          <div class="cohort-card-heading">
            <div>
              <p class="muted">{{ card.source }}</p>
              <h2>{{ card.studentName }} · {{ card.labName }}</h2>
            </div>
            <StatusBadge :tone="learnerTone(card.learnerStatus)">
              {{ card.learnerStatus }}
            </StatusBadge>
          </div>
          <dl class="cohort-card-metrics">
            <div>
              <dt>Evidence</dt>
              <dd>{{ card.evidenceScoreLabel }}</dd>
            </div>
            <div>
              <dt>Submission</dt>
              <dd>{{ card.submissionStatus }} · {{ card.submissionPercent }}%</dd>
            </div>
            <div>
              <dt>Current stage</dt>
              <dd>{{ card.currentStageTitle }}</dd>
            </div>
            <div>
              <dt>Next lesson</dt>
              <dd>{{ card.nextLesson?.title || 'Не задан' }}</dd>
            </div>
          </dl>
          <ul class="cohort-risk-list">
            <li v-for="risk in card.risks.slice(0, 4)" :key="risk">
              {{ risk }}
            </li>
            <li v-if="card.risks.length === 0">Открытых рисков нет.</li>
          </ul>
        </article>

        <div v-if="cohortState.visibleCards.length === 0" class="cohort-empty-state">
          <strong>Нет учеников по текущему фильтру</strong>
          <p>Смените фильтр или импортируйте session.json в Session Workspace.</p>
        </div>
      </section>

      <aside class="cohort-side-rail">
        <section class="cohort-panel" aria-label="Skill heatmap">
          <p class="muted">skill heatmap</p>
          <h2>Навыки</h2>
          <div class="cohort-skill-list">
            <article
              v-for="skill in cohortState.skillHeatmap"
              :key="`${skill.code}:${skill.title}`"
            >
              <strong>{{ skill.title }}</strong>
              <span>{{ skill.confirmedCount }} confirmed · {{ skill.gapCount }} gaps</span>
            </article>
          </div>
        </section>

        <section class="cohort-panel cohort-export" aria-label="Cohort export">
          <div class="cohort-export-heading">
            <div>
              <p class="muted">handoff</p>
              <h2>Что делать дальше</h2>
            </div>
            <CopyButton :text="cohortState.reportMarkdown" label="Копировать" />
          </div>
          <textarea :value="cohortState.reportMarkdown" readonly aria-label="Cohort markdown" />
        </section>
      </aside>
    </div>
  </AppShell>
</template>
