<script setup lang="ts">
import { computed } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import StatusBadge from '~/components/shared/ui/StatusBadge.vue'
import { useSessionWorkspaceState } from './useSessionWorkspaceState'

const props = defineProps<{
  currentSession: AcademySession | null
  currentSource: string
  currentIsValid: boolean
}>()

const emit = defineEmits<{
  'open-hub': []
  'open-current-session': []
  'open-session': [payload: { session: AcademySession; source: string }]
  'open-review': [payload: { session: AcademySession; source: string }]
}>()

const {
  importError,
  importIssues,
  importSessionFile,
  removeEntry,
  selectEntry,
  workspaceState
} = useSessionWorkspaceState()

const selectedEntry = computed(() => workspaceState.value.selectedEntry)
const selectedSummary = computed(() =>
  workspaceState.value.summaries.find(summary => summary.id === selectedEntry.value?.id)
)

const onFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    await importSessionFile(file)
    input.value = ''
  }
}

const sourceForEntry = (entry: NonNullable<typeof selectedEntry.value>) =>
  `workspace:${entry.session.student_name}:${entry.session.lab_name}`

const openEntry = (entryId: string) => {
  const entry = workspaceState.value.entries.find(candidate => candidate.id === entryId)
  if (entry) {
    selectEntry(entry.id)
    emit('open-session', {
      session: entry.session,
      source: sourceForEntry(entry)
    })
  }
}

const openReview = (entryId: string) => {
  const entry = workspaceState.value.entries.find(candidate => candidate.id === entryId)
  if (entry) {
    selectEntry(entry.id)
    emit('open-review', {
      session: entry.session,
      source: sourceForEntry(entry)
    })
  }
}

const openSelectedEntry = () => {
  if (selectedEntry.value) {
    openEntry(selectedEntry.value.id)
  }
}

const openSelectedReview = () => {
  if (selectedEntry.value) {
    openReview(selectedEntry.value.id)
  }
}
</script>

<template>
  <div class="session-workspace-shell">
    <header class="workspace-topbar">
      <div>
        <p class="muted">session runs</p>
        <h1>Session Workspace</h1>
        <p>{{ workspaceState.entries.length }} runs · {{ workspaceState.studentCount }} students</p>
      </div>
      <div class="workspace-topbar-actions">
        <button class="quiet-button" type="button" @click="emit('open-hub')">
          Вернуться в каталог
        </button>
        <button
          class="quiet-button"
          type="button"
          :disabled="!currentIsValid"
          @click="emit('open-current-session')"
        >
          Открыть текущую live-сессию
        </button>
      </div>
    </header>

    <section class="workspace-import-panel" aria-label="Импорт session json">
      <div>
        <p class="muted">import</p>
        <h2>Добавить session.json</h2>
        <p>
          Файл читается локально в браузере, проходит валидацию
          academy-session/v1 и сохраняется в recent runs.
        </p>
      </div>
      <label class="workspace-file-picker">
        <span>Выбрать session.json</span>
        <input
          type="file"
          accept=".json,application/json"
          @change="onFileChange"
        >
      </label>
    </section>

    <section
      v-if="currentSession"
      class="workspace-live-card"
      aria-label="Текущая live-сессия"
    >
      <div>
        <p class="muted">live source</p>
        <h2>{{ currentSession.student_name }} · {{ currentSession.lab_name }}</h2>
        <p>{{ currentSource }}</p>
      </div>
      <StatusBadge :tone="currentIsValid ? 'success' : 'warning'">
        {{ currentIsValid ? 'valid' : 'invalid' }}
      </StatusBadge>
    </section>

    <section
      v-if="importError || importIssues.length"
      class="workspace-error-panel"
      aria-label="Ошибки импорта"
    >
      <div>
        <strong>{{ importError }}</strong>
        <ul>
          <li v-for="issue in importIssues" :key="`${issue.path}:${issue.message}`">
            <code>{{ issue.path }}</code> {{ issue.message }}
          </li>
        </ul>
      </div>
    </section>

    <div class="session-workspace-grid">
      <section class="workspace-run-list" aria-label="Recent session runs">
        <article
          v-for="summary in workspaceState.summaries"
          :key="summary.id"
          class="workspace-run-card"
          :class="{ active: selectedEntry?.id === summary.id }"
        >
          <button
            type="button"
            class="workspace-run-select"
            :aria-pressed="selectedEntry?.id === summary.id"
            @click="selectEntry(summary.id)"
          >
            <span>{{ summary.studentName }}</span>
            <strong>{{ summary.labName }}</strong>
            <small>{{ summary.importedAt }}</small>
          </button>
          <div class="workspace-run-meta">
            <span>{{ summary.currentStageTitle }}</span>
            <span>{{ summary.stageCount }} stages</span>
            <span>{{ summary.evidenceCount }} evidence</span>
          </div>
          <div class="workspace-run-actions">
            <button class="quiet-button" type="button" @click="openEntry(summary.id)">
              Открыть cockpit
            </button>
            <button class="quiet-button" type="button" @click="openReview(summary.id)">
              Открыть review
            </button>
            <button class="quiet-button" type="button" @click="removeEntry(summary.id)">
              Удалить
            </button>
          </div>
        </article>

        <div v-if="workspaceState.entries.length === 0" class="workspace-empty-state">
          <strong>Recent runs пока пуст</strong>
          <p>Импортируйте session-файл из artifacts/sessions/.../session.json.</p>
        </div>
      </section>

      <aside class="workspace-details" aria-label="Выбранная session">
        <template v-if="selectedEntry && selectedSummary">
          <p class="muted">selected run</p>
          <h2>{{ selectedSummary.studentName }}</h2>
          <dl>
            <div>
              <dt>Лаборатория</dt>
              <dd>{{ selectedSummary.labName }}</dd>
            </div>
            <div>
              <dt>Текущий этап</dt>
              <dd>{{ selectedSummary.currentStageTitle }}</dd>
            </div>
            <div>
              <dt>Источник</dt>
              <dd>{{ selectedSummary.sourceName }}</dd>
            </div>
            <div>
              <dt>Последнее событие</dt>
              <dd>{{ selectedSummary.lastEventLabel }}</dd>
            </div>
          </dl>
          <button class="quiet-button workspace-primary-action" type="button" @click="openSelectedEntry">
            Открыть cockpit
          </button>
          <button class="quiet-button" type="button" @click="openSelectedReview">
            Открыть review
          </button>
        </template>

        <template v-else>
          <p class="muted">selected run</p>
          <h2>Сессия не выбрана</h2>
          <p>Добавьте session.json или выберите recent run.</p>
        </template>
      </aside>
    </div>
  </div>
</template>
