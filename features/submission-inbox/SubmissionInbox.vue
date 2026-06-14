<script setup lang="ts">
import { toRef } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import AppShell from '~/components/shared/ui/AppShell.vue'
import CopyButton from '~/components/shared/ui/CopyButton.vue'
import StatusBadge from '~/components/shared/ui/StatusBadge.vue'
import { useSubmissionInboxState } from './useSubmissionInboxState'

const props = defineProps<{
  session: AcademySession
  source: string
  canOpenHub?: boolean
  canOpenWorkspace?: boolean
  canOpenReview?: boolean
  canOpenSession?: boolean
}>()

const emit = defineEmits<{
  'open-hub': []
  'open-workspace': []
  'open-review': []
  'open-session': []
}>()

const sessionRef = toRef(props, 'session')
const {
  exportJson,
  hydrate,
  inboxState,
  reportMarkdown,
  submitDraft,
  updateEvidence
} = useSubmissionInboxState(sessionRef)

const scoreTone = () => inboxState.value.draftScore.percent === 100 ? 'success' : 'warning'
const latestTone = () =>
  inboxState.value.latestSubmission?.status === 'ready-for-review' ? 'success' : 'warning'
const evidenceValue = (itemId: string) => inboxState.value.draft.evidenceByItem[itemId] ?? ''
const onEvidenceInput = (itemId: string, event: Event) => {
  if (event.target instanceof HTMLTextAreaElement) {
    updateEvidence(itemId, event.target.value)
  }
}
const formatDate = (value?: string) => value ? new Date(value).toLocaleString('ru-RU') : ''
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
        Вернуться в cockpit
      </button>
      <button
        v-if="canOpenReview"
        class="quiet-button portal-action-button"
        type="button"
        @click="emit('open-review')"
      >
        Открыть review
      </button>
    </template>

    <header class="topbar submission-topbar">
      <div>
        <p class="muted">student submission</p>
        <h1>Submission Inbox</h1>
        <p>{{ inboxState.title }}</p>
      </div>
      <div class="submission-topbar-actions">
        <StatusBadge :tone="scoreTone()">
          {{ inboxState.draftScore.percent }}% complete
        </StatusBadge>
        <button class="quiet-button" type="button" @click="hydrate">
          Обновить inbox
        </button>
      </div>
    </header>

    <section class="submission-summary" aria-label="Submission readiness">
      <div>
        <p class="muted">draft completeness</p>
        <strong>
          {{ inboxState.draftScore.completed }}/{{ inboxState.draftScore.total }}
        </strong>
        <span>{{ inboxState.draftStatus }}</span>
      </div>
      <div>
        <p class="muted">что проверит ментор</p>
        <ul>
          <li v-for="risk in inboxState.draftRisks.slice(0, 3)" :key="risk">
            {{ risk }}
          </li>
          <li v-if="inboxState.draftRisks.length === 0">
            Все обязательные evidence items приложены.
          </li>
        </ul>
      </div>
    </section>

    <div class="submission-grid">
      <form class="submission-form" aria-label="Student homework submission" @submit.prevent="submitDraft">
        <div class="submission-form-heading">
          <div>
            <p class="muted">student wizard</p>
            <h2>Сдать домашку</h2>
          </div>
          <button class="primary-button" type="submit">
            Отправить submission
          </button>
        </div>

        <label
          v-for="item in inboxState.checklist"
          :key="item.id"
          class="submission-evidence-field"
          :for="`submission-${item.id}`"
        >
          <span>{{ item.title }}</span>
          <small>{{ item.prompt }}</small>
          <code v-if="item.reference">{{ item.reference }}</code>
          <textarea
            :id="`submission-${item.id}`"
            :aria-label="`Evidence for ${item.title}`"
            :value="evidenceValue(item.id)"
            rows="4"
            @input="onEvidenceInput(item.id, $event)"
          />
        </label>
      </form>

      <aside class="submission-mentor-rail" aria-label="Mentor submission inbox">
        <section class="submission-card">
          <div class="submission-card-heading">
            <div>
              <p class="muted">mentor inbox</p>
              <h2>Последняя сдача</h2>
            </div>
            <StatusBadge v-if="inboxState.latestSubmission" :tone="latestTone()">
              {{ inboxState.latestSubmission.status }}
            </StatusBadge>
          </div>
          <p v-if="!inboxState.latestSubmission" class="submission-empty">
            Submission еще не отправлен. Как только ученик нажмет отправку, здесь появится отчет.
          </p>
          <template v-else>
            <p class="submission-meta">
              {{ formatDate(inboxState.latestSubmission.createdAt) }}
              · {{ inboxState.latestSubmission.score.percent }}% complete
            </p>
            <ul class="submission-evidence-list">
              <li
                v-for="item in inboxState.latestSubmission.evidence"
                :key="item.id"
              >
                <strong>{{ item.title }}</strong>
                <span>{{ item.value || 'missing' }}</span>
              </li>
            </ul>
          </template>
        </section>

        <section class="submission-card submission-export">
          <div class="submission-card-heading">
            <div>
              <p class="muted">handoff</p>
              <h2>Отчет по сдаче</h2>
            </div>
            <div class="submission-export-actions">
              <CopyButton :text="reportMarkdown" label="Копировать Markdown" />
              <CopyButton :text="exportJson" label="Копировать JSON" />
            </div>
          </div>
          <textarea :value="reportMarkdown" readonly aria-label="Submission markdown" />
        </section>
      </aside>
    </div>
  </AppShell>
</template>
