<script setup lang="ts">
import { computed, toRef } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import type { PortalSurface } from '~/features/global-navigation/global-navigation-state'
import AppShell from '~/components/shared/ui/AppShell.vue'
import StatusBadge from '~/components/shared/ui/StatusBadge.vue'
import { useMissionControlState } from './useMissionControlState'

const props = defineProps<{
  session: AcademySession
  source: string
  catalogIsValid: boolean
  sessionIsValid: boolean
  canOpenHub?: boolean
  canOpenRelease?: boolean
  canOpenWorkspace?: boolean
  canOpenSession?: boolean
  canOpenReview?: boolean
  canOpenAssessment?: boolean
  canOpenSubmission?: boolean
  canOpenCohort?: boolean
  canOpenPostLesson?: boolean
}>()

const emit = defineEmits<{
  'open-hub': []
  'open-release': []
  'open-workspace': []
  'open-session': []
  'open-review': []
  'open-assessment': []
  'open-submission': []
  'open-cohort': []
  'open-post-lesson': []
}>()

const sessionRef = toRef(props, 'session')
const catalogIsValidRef = toRef(props, 'catalogIsValid')
const sessionIsValidRef = toRef(props, 'sessionIsValid')
const { hydrate, missionState, reportMarkdown } = useMissionControlState(sessionRef, {
  catalogIsValid: catalogIsValidRef,
  sessionIsValid: sessionIsValidRef
})

const phaseLabel = computed(() => missionState.value.phase.replace('-', ' '))

const openSurface = (surface: PortalSurface) => {
  if (surface === 'hub') emit('open-hub')
  if (surface === 'release') emit('open-release')
  if (surface === 'workspace') emit('open-workspace')
  if (surface === 'session') emit('open-session')
  if (surface === 'review') emit('open-review')
  if (surface === 'assessment') emit('open-assessment')
  if (surface === 'submission') emit('open-submission')
  if (surface === 'cohort') emit('open-cohort')
  if (surface === 'post-lesson') emit('open-post-lesson')
}

const canOpenSurface = (surface: PortalSurface) => ({
  hub: props.canOpenHub,
  release: props.canOpenRelease,
  workspace: props.canOpenWorkspace,
  session: props.canOpenSession,
  review: props.canOpenReview,
  assessment: props.canOpenAssessment,
  submission: props.canOpenSubmission,
  cohort: props.canOpenCohort,
  'post-lesson': props.canOpenPostLesson,
  'mission-control': false
})[surface] ?? false
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
        v-if="canOpenPostLesson"
        class="quiet-button portal-action-button"
        type="button"
        @click="emit('open-post-lesson')"
      >
        Открыть pack
      </button>
    </template>

    <header class="topbar mission-topbar">
      <div>
        <p class="muted">mentor operations</p>
        <h1>Mentor Mission Control</h1>
        <p>{{ missionState.title }}</p>
      </div>
      <div class="mission-topbar-actions">
        <StatusBadge :tone="missionState.nextAction.status === 'ready' ? 'success' : 'warning'">
          {{ phaseLabel }}
        </StatusBadge>
        <button class="quiet-button" type="button" @click="hydrate">
          Обновить mission
        </button>
      </div>
    </header>

    <section id="current-stage" class="mission-next-action" aria-label="Mission next action">
      <div>
        <p class="muted">{{ missionState.nextAction.priority }} · {{ missionState.nextAction.status }}</p>
        <h2>{{ missionState.nextAction.title }}</h2>
        <p>{{ missionState.nextAction.description }}</p>
      </div>
      <button
        v-if="canOpenSurface(missionState.nextAction.targetSurface)"
        class="primary-button"
        type="button"
        @click="openSurface(missionState.nextAction.targetSurface)"
      >
        {{
          missionState.quickLinks.find(link => link.surface === missionState.nextAction.targetSurface)?.label
            ?? 'Открыть'
        }}
      </button>
    </section>

    <section class="mission-signals" aria-label="Mission signals">
      <article v-for="signal in missionState.signals" :key="signal.code">
        <p>{{ signal.label }}</p>
        <strong>{{ signal.value }}</strong>
        <span>{{ signal.detail }}</span>
      </article>
    </section>

    <div class="mission-grid">
      <section class="mission-checklist" aria-label="Mission journey checklist">
        <article
          v-for="section in missionState.checklist"
          :key="section.code"
          class="mission-panel"
        >
          <div class="mission-panel-head">
            <h2>{{ section.title }}</h2>
            <StatusBadge :tone="section.status === 'ready' ? 'success' : section.status === 'blocked' ? 'warning' : 'neutral'">
              {{ section.status }}
            </StatusBadge>
          </div>
          <ul>
            <li v-for="item in section.items" :key="item.code">
              <span>{{ item.title }}</span>
              <small>{{ item.detail }}</small>
            </li>
          </ul>
        </article>
      </section>

      <aside class="mission-side-rail">
        <section class="mission-panel" aria-label="Mission focus queue">
          <p class="muted">focus queue</p>
          <h2>Что закрыть первым</h2>
          <ul>
            <li v-for="action in missionState.focusQueue" :key="action.code">
              <span>{{ action.title }}</span>
              <small>{{ action.description }}</small>
            </li>
            <li v-if="missionState.focusQueue.length === 0">
              <span>Открытых задач нет</span>
              <small>Можно готовить следующий урок.</small>
            </li>
          </ul>
        </section>

        <section class="mission-panel" aria-label="Mission quick links">
          <p class="muted">quick links</p>
          <h2>Переходы</h2>
          <div class="mission-link-list">
            <button
              v-for="link in missionState.quickLinks"
              :key="link.surface"
              class="quiet-button"
              type="button"
              :disabled="!canOpenSurface(link.surface)"
              @click="openSurface(link.surface)"
            >
              {{ link.label }}
            </button>
          </div>
        </section>
      </aside>
    </div>

    <section class="mission-export" aria-label="Mission Control export">
      <div class="mission-panel-head">
        <div>
          <p class="muted">copy-ready</p>
          <h2>Mission report</h2>
        </div>
      </div>
      <textarea :value="reportMarkdown" readonly aria-label="Mission Control report markdown" />
    </section>
  </AppShell>
</template>
