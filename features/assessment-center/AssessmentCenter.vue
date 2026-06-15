<script setup lang="ts">
import { toRef } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import AppShell from '~/components/shared/ui/AppShell.vue'
import CopyButton from '~/components/shared/ui/CopyButton.vue'
import StatusBadge from '~/components/shared/ui/StatusBadge.vue'
import type { AssessmentSkillLevel } from './assessment-center-state'
import { useAssessmentCenterState } from './useAssessmentCenterState'

const props = defineProps<{
  session: AcademySession
  source: string
  canOpenHub?: boolean
  canOpenWorkspace?: boolean
  canOpenSession?: boolean
  canOpenReview?: boolean
  canOpenSubmission?: boolean
  canOpenCohort?: boolean
  canOpenPostLesson?: boolean
}>()

const emit = defineEmits<{
  'open-hub': []
  'open-workspace': []
  'open-session': []
  'open-review': []
  'open-submission': []
  'open-cohort': []
  'open-post-lesson': []
}>()

const sessionRef = toRef(props, 'session')
const {
  assessmentState,
  exportJson,
  hydrate,
  reportMarkdown
} = useAssessmentCenterState(sessionRef)

const levelTone = (level: AssessmentSkillLevel) =>
  level === 'can-apply' || level === 'can-explain'
    ? 'success'
    : level === 'can-repeat' || level === 'aware' ? 'warning' : 'neutral'

const formatSources = (sources: string[]) =>
  sources.length > 0 ? sources.join(' / ') : 'no evidence yet'
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
      <button
        v-if="canOpenCohort"
        class="quiet-button portal-action-button"
        type="button"
        @click="emit('open-cohort')"
      >
        Открыть cohort
      </button>
      <button
        v-if="canOpenPostLesson"
        class="quiet-button portal-action-button"
        type="button"
        @click="emit('open-post-lesson')"
      >
        Открыть pack
      </button>
    </template>

    <header class="topbar assessment-topbar">
      <div>
        <p class="muted">learning path</p>
        <h1>Skill Assessment Center</h1>
        <p>{{ assessmentState.title }}</p>
      </div>
      <div class="assessment-topbar-actions">
        <StatusBadge :tone="assessmentState.metrics.nextLessonFocusCount === 0 ? 'success' : 'warning'">
          {{ assessmentState.metrics.nextLessonFocusCount }} focus
        </StatusBadge>
        <button class="quiet-button" type="button" @click="hydrate">
          Обновить assessment
        </button>
      </div>
    </header>

    <section id="current-stage" class="assessment-metrics" aria-label="Assessment metrics">
      <article>
        <span>{{ assessmentState.metrics.masteryPercent }}%</span>
        <p>mastery</p>
      </article>
      <article>
        <span>{{ assessmentState.metrics.readySkillCount }}/{{ assessmentState.metrics.skillCount }}</span>
        <p>ready skills</p>
      </article>
      <article>
        <span>{{ assessmentState.metrics.blockedSkillCount }}</span>
        <p>blocked/fresh gaps</p>
      </article>
      <article>
        <span>{{ assessmentState.metrics.nextLessonFocusCount }}</span>
        <p>next lesson focus</p>
      </article>
    </section>

    <div class="assessment-grid">
      <section class="assessment-skill-list" aria-label="Skill assessment list">
        <article
          v-for="skill in assessmentState.skills"
          :key="skill.code"
          class="assessment-skill-card"
        >
          <div class="assessment-skill-card__head">
            <div>
              <p class="muted">{{ skill.code }} · {{ skill.stageTitle }}</p>
              <h2>{{ skill.title }}</h2>
            </div>
            <StatusBadge :tone="levelTone(skill.level)">
              {{ skill.level }}
            </StatusBadge>
          </div>
          <p class="assessment-sources">{{ formatSources(skill.evidenceSources) }}</p>
          <ul>
            <li v-for="detail in skill.evidenceDetails" :key="detail">{{ detail }}</li>
          </ul>
          <p v-if="skill.blocker" class="assessment-blocker">{{ skill.blocker }}</p>
          <strong>{{ skill.nextAction }}</strong>
        </article>
      </section>

      <aside class="assessment-side-rail">
        <section class="assessment-panel" aria-label="Learning path">
          <p class="muted">path</p>
          <h2>Маршрут развития</h2>
          <ol>
            <li v-for="item in assessmentState.learningPath" :key="item.code">
              <span>{{ item.title }}</span>
              <p>{{ item.description }}</p>
            </li>
          </ol>
        </section>

        <section class="assessment-panel" aria-label="Assessment recommendations">
          <p class="muted">mentor next actions</p>
          <h2>Рекомендации</h2>
          <ul>
            <li v-for="item in assessmentState.recommendations" :key="item">{{ item }}</li>
          </ul>
        </section>
      </aside>
    </div>

    <section class="assessment-export" aria-label="Assessment export">
      <div class="assessment-export-heading">
        <div>
          <p class="muted">copy-ready</p>
          <h2>Assessment report</h2>
        </div>
        <div class="assessment-export-actions">
          <CopyButton :text="reportMarkdown" label="Копировать Assessment" />
          <CopyButton :text="exportJson" label="Копировать JSON" />
        </div>
      </div>
      <textarea :value="reportMarkdown" readonly aria-label="Assessment report markdown" />
    </section>
  </AppShell>
</template>
