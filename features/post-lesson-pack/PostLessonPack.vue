<script setup lang="ts">
import { toRef } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import AppShell from '~/components/shared/ui/AppShell.vue'
import CopyButton from '~/components/shared/ui/CopyButton.vue'
import StatusBadge from '~/components/shared/ui/StatusBadge.vue'
import { usePostLessonPackState } from './usePostLessonPackState'

const props = defineProps<{
  session: AcademySession
  source: string
  canOpenHub?: boolean
  canOpenWorkspace?: boolean
  canOpenSession?: boolean
  canOpenReview?: boolean
  canOpenSubmission?: boolean
  canOpenCohort?: boolean
}>()

const emit = defineEmits<{
  'open-hub': []
  'open-workspace': []
  'open-session': []
  'open-review': []
  'open-submission': []
  'open-cohort': []
}>()

const sessionRef = toRef(props, 'session')
const { exportJson, hydrate, packetMarkdown, packState } = usePostLessonPackState(sessionRef)

const readinessTone = () =>
  packState.value.readiness === 'ready-to-send' ? 'success' : 'warning'

const formatDelta = (minutes: number) => minutes > 0 ? `+${minutes}` : String(minutes)
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
    </template>

    <header class="topbar post-lesson-topbar">
      <div>
        <p class="muted">post-lesson operations</p>
        <h1>Post-Lesson Pack</h1>
        <p>{{ packState.title }}</p>
      </div>
      <div class="post-lesson-topbar-actions">
        <StatusBadge :tone="readinessTone()">
          {{ packState.readiness }}
        </StatusBadge>
        <button class="quiet-button" type="button" @click="hydrate">
          Обновить pack
        </button>
      </div>
    </header>

    <section id="current-stage" class="post-lesson-metrics" aria-label="Post-lesson metrics">
      <article>
        <span>{{ packState.metrics.evidencePercent }}%</span>
        <p>evidence</p>
      </article>
      <article>
        <span>{{ packState.metrics.homeworkPercent }}%</span>
        <p>homework</p>
      </article>
      <article>
        <span>{{ formatDelta(packState.metrics.ledgerDeltaMinutes) }} min</span>
        <p>time delta</p>
      </article>
      <article>
        <span>{{ packState.metrics.unresolvedCount }}</span>
        <p>unresolved</p>
      </article>
    </section>

    <div class="post-lesson-grid">
      <section class="post-lesson-section-list" aria-label="Post-lesson packet sections">
        <article
          v-for="section in packState.sections"
          :key="section.code"
          class="post-lesson-card"
        >
          <p class="muted">{{ section.code }}</p>
          <h2>{{ section.title }}</h2>
          <ul>
            <li v-for="item in section.items" :key="item">{{ item }}</li>
          </ul>
        </article>
      </section>

      <aside class="post-lesson-side-rail">
        <section class="post-lesson-card" aria-label="Unresolved blockers">
          <p class="muted">blockers</p>
          <h2>Что не закрыто</h2>
          <ul>
            <li v-for="item in packState.unresolvedBlockers" :key="item">{{ item }}</li>
            <li v-if="packState.unresolvedBlockers.length === 0">Открытых blockers нет.</li>
          </ul>
        </section>

        <section class="post-lesson-card" aria-label="Action items">
          <p class="muted">actions</p>
          <h2>Следующие действия</h2>
          <ul>
            <li v-for="item in packState.actionItems" :key="item">{{ item }}</li>
          </ul>
        </section>
      </aside>
    </div>

    <section class="post-lesson-export" aria-label="Post-lesson packet export">
      <div class="post-lesson-export-heading">
        <div>
          <p class="muted">copy-ready</p>
          <h2>Единый пакет после урока</h2>
        </div>
        <div class="post-lesson-export-actions">
          <CopyButton :text="packetMarkdown" label="Копировать Pack" />
          <CopyButton :text="exportJson" label="Копировать JSON" />
        </div>
      </div>
      <textarea :value="packetMarkdown" readonly aria-label="Post-lesson packet markdown" />
    </section>
  </AppShell>
</template>
