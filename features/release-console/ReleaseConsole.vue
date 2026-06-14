<script setup lang="ts">
import { toRef } from 'vue'
import type { AcademyCatalog } from '~/core/catalog/domain/academy-catalog'
import type { AcademySession } from '~/core/session/domain/academy-session'
import AppShell from '~/components/shared/ui/AppShell.vue'
import CopyButton from '~/components/shared/ui/CopyButton.vue'
import StatusBadge from '~/components/shared/ui/StatusBadge.vue'
import { useReleaseConsoleState } from './useReleaseConsoleState'
import type { ReleaseGoNoGo } from './release-console-state'

const props = defineProps<{
  catalog: AcademyCatalog
  session: AcademySession | null
  source: string
  canOpenHub?: boolean
  canOpenSession?: boolean
}>()

const emit = defineEmits<{
  'open-hub': []
  'open-session': []
}>()

const catalogRef = toRef(props, 'catalog')
const sessionRef = toRef(props, 'session')
const {
  hydrate,
  releaseState,
  selectLesson,
  selectTrack
} = useReleaseConsoleState(catalogRef, sessionRef)

const toneFor = (value: ReleaseGoNoGo) => value === 'go' ? 'success' : 'warning'
</script>

<template>
  <AppShell
    :stages="session?.stages ?? []"
    :current-stage-code="session?.current_stage.code"
    :framework="session?.portal.framework"
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
        v-if="canOpenSession && session"
        class="quiet-button portal-action-button"
        type="button"
        @click="emit('open-session')"
      >
        Открыть cockpit
      </button>
    </template>

    <header class="topbar release-topbar">
      <div>
        <p class="muted">go/no-go</p>
        <h1>Lesson Release Console</h1>
        <p>Pre-flight контроль уроков: артефакты, команды, readiness и риски.</p>
      </div>
      <div class="release-topbar-actions">
        <StatusBadge :tone="toneFor(releaseState.selectedLesson.goNoGo)">
          {{ releaseState.selectedLesson.goNoGo }}
        </StatusBadge>
        <button class="quiet-button" type="button" @click="hydrate">
          Обновить release
        </button>
        <CopyButton :text="releaseState.reportMarkdown" label="Копировать Markdown" />
      </div>
    </header>

    <section class="release-metrics" aria-label="Release metrics">
      <article>
        <span>{{ releaseState.summary.lessonCount }}</span>
        <p>уроков в каталоге</p>
      </article>
      <article>
        <span>{{ releaseState.summary.goCount }} go</span>
        <p>можно проводить</p>
      </article>
      <article>
        <span>{{ releaseState.summary.watchCount }} watch</span>
        <p>нужна ручная проверка</p>
      </article>
      <article>
        <span>{{ releaseState.summary.blockedCount }} blocked</span>
        <p>нельзя выпускать без фикса</p>
      </article>
    </section>

    <section class="release-track-bar" aria-label="Release tracks">
      <button
        v-for="track in releaseState.trackSummaries"
        :key="track.code"
        class="quiet-button"
        type="button"
        :aria-pressed="releaseState.selectedTrack.code === track.code"
        :class="{ active: releaseState.selectedTrack.code === track.code }"
        @click="selectTrack(track.code)"
      >
        {{ track.title }}
      </button>
    </section>

    <div class="release-grid">
      <section class="release-lesson-list" aria-label="Release lessons">
        <button
          v-for="lesson in releaseState.visibleLessons"
          :key="lesson.id"
          class="release-lesson-button"
          type="button"
          :aria-pressed="releaseState.selectedLesson.id === lesson.id"
          @click="selectLesson(lesson.trackCode, lesson.lessonCode)"
        >
          <span>{{ lesson.lessonTitle }}</span>
          <small>{{ lesson.readinessPercent }}% · {{ lesson.goNoGo }}</small>
        </button>
      </section>

      <section class="release-detail" aria-label="Selected release detail">
        <div class="release-detail-heading">
          <div>
            <p class="muted">{{ releaseState.selectedLesson.trackTitle }}</p>
            <h2>{{ releaseState.selectedLesson.lessonTitle }}</h2>
          </div>
          <StatusBadge :tone="toneFor(releaseState.selectedLesson.goNoGo)">
            {{ releaseState.selectedLesson.goNoGo }}
          </StatusBadge>
        </div>

        <div class="release-check-grid">
          <article
            v-for="check in releaseState.selectedLesson.checks"
            :key="check.label"
            class="release-check-card"
          >
            <div>
              <strong>{{ check.label }}</strong>
              <StatusBadge :tone="check.status === 'ready' ? 'success' : 'warning'">
                {{ check.status }}
              </StatusBadge>
            </div>
            <p>{{ check.detail }}</p>
            <small v-if="check.evidence.length > 0">{{ check.evidence[0] }}</small>
          </article>
        </div>

        <div class="release-lower-grid">
          <section class="release-panel" aria-label="Release commands">
            <div class="release-panel-heading">
              <div>
                <p class="muted">verification</p>
                <h2>Команды проверки</h2>
              </div>
              <CopyButton
                :text="releaseState.selectedLesson.commands.join('\n')"
                label="Копировать"
              />
            </div>
            <code
              v-for="command in releaseState.selectedLesson.commands.slice(0, 8)"
              :key="command"
            >
              {{ command }}
            </code>
          </section>

          <section class="release-panel" aria-label="Release risks">
            <p class="muted">risk register</p>
            <h2>Риски</h2>
            <ul>
              <li v-for="risk in releaseState.selectedLesson.risks" :key="risk">
                {{ risk }}
              </li>
              <li v-if="releaseState.selectedLesson.risks.length === 0">
                Открытых release-рисков нет.
              </li>
            </ul>
          </section>
        </div>

        <section class="release-panel release-export" aria-label="Release export">
          <div class="release-panel-heading">
            <div>
              <p class="muted">handoff</p>
              <h2>Release report</h2>
            </div>
            <CopyButton :text="releaseState.reportMarkdown" label="Копировать" />
          </div>
          <textarea :value="releaseState.reportMarkdown" readonly aria-label="Release markdown" />
        </section>
      </section>
    </div>
  </AppShell>
</template>
