<script setup lang="ts">
import { computed, toRef } from 'vue'
import type { AcademyCatalog } from '~/core/catalog/domain/academy-catalog'
import type { AcademySession } from '~/core/session/domain/academy-session'
import CopyButton from '~/components/shared/ui/CopyButton.vue'
import StatusBadge from '~/components/shared/ui/StatusBadge.vue'
import { useWorkspaceSyncState } from './useWorkspaceSyncState'
import type { WorkspaceReadiness } from './workspace-sync-state'

const props = defineProps<{
  catalog: AcademyCatalog
  catalogSource: string
  session?: AcademySession | null
  canOpenHub?: boolean
  canOpenAuthoring?: boolean
}>()

const emit = defineEmits<{
  'open-hub': []
  'open-authoring': []
}>()

const catalogRef = toRef(props, 'catalog')
const sessionRef = toRef(props, 'session')
const {
  importState,
  importText,
  refreshSnapshot,
  restoreImport,
  restoreStatus,
  setImportText,
  syncState
} = useWorkspaceSyncState(catalogRef, sessionRef)

const canRestore = computed(() =>
  Boolean(importState.value.package) && importState.value.readiness !== 'blocked'
)
const readinessTone = (readiness: WorkspaceReadiness) =>
  readiness === 'ready' ? 'success' : readiness === 'blocked' ? 'warning' : 'neutral'
const updateImportText = (event: Event) => {
  if (event.target instanceof HTMLTextAreaElement) {
    setImportText(event.target.value)
  }
}
</script>

<template>
  <main class="sync-shell">
    <header class="sync-topbar">
      <div>
        <p class="muted">browser-local workspace</p>
        <h1>Workspace Sync Center</h1>
        <p>{{ catalog.contract_version }} · {{ catalogSource }}</p>
      </div>
      <div class="sync-topbar-actions">
        <StatusBadge :tone="readinessTone(syncState.readiness)">
          {{ syncState.readiness }}
        </StatusBadge>
        <button class="quiet-button" type="button" @click="refreshSnapshot">
          Refresh snapshot
        </button>
        <button
          v-if="canOpenAuthoring"
          class="quiet-button"
          type="button"
          @click="emit('open-authoring')"
        >
          Lesson Authoring Studio
        </button>
        <button
          v-if="canOpenHub"
          class="quiet-button"
          type="button"
          @click="emit('open-hub')"
        >
          Lesson Hub
        </button>
      </div>
    </header>

    <section class="sync-metrics" aria-label="Workspace snapshot summary">
      <article>
        <span>{{ syncState.totalRecords }}</span>
        <p>records</p>
      </article>
      <article>
        <span>{{ syncState.groupSummaries.length }}</span>
        <p>groups</p>
      </article>
      <article>
        <span>{{ syncState.totalSizeBytes }}</span>
        <p>bytes</p>
      </article>
      <article>
        <span>{{ syncState.issues.length }}</span>
        <p>issues</p>
      </article>
    </section>

    <div class="sync-grid">
      <section class="sync-panel" aria-label="Workspace records">
        <div class="sync-panel-head">
          <div>
            <p class="muted">snapshot</p>
            <h2>Records</h2>
          </div>
          <CopyButton :text="syncState.workspaceJson" label="Copy package" />
        </div>
        <div class="sync-record-list">
          <article v-for="record in syncState.records" :key="record.key" class="sync-record">
            <div>
              <strong>{{ record.key }}</strong>
              <small>{{ record.group }} · {{ record.sizeBytes }} bytes</small>
            </div>
            <StatusBadge :tone="record.status === 'ready' ? 'success' : 'warning'">
              {{ record.status }}
            </StatusBadge>
          </article>
          <p v-if="syncState.records.length === 0" class="muted">
            Portal-owned records пока нет.
          </p>
        </div>
      </section>

      <section class="sync-panel" aria-label="Workspace validation">
        <div class="sync-panel-head">
          <div>
            <p class="muted">quality gate</p>
            <h2>Validation</h2>
          </div>
          <StatusBadge :tone="readinessTone(importState.readiness)">
            {{ importState.readiness }}
          </StatusBadge>
        </div>
        <ul class="sync-issue-list">
          <li v-for="issue in syncState.issues" :key="issue.code + issue.detail">
            <strong>{{ issue.title }}</strong>
            <span>{{ issue.detail }}</span>
          </li>
          <li v-if="syncState.issues.length === 0">
            Snapshot без blocker и warning.
          </li>
        </ul>
      </section>
    </div>

    <section class="sync-panel sync-export" aria-label="Workspace import restore">
      <div class="sync-panel-head">
        <div>
          <p class="muted">restore preview</p>
          <h2>Import / restore</h2>
        </div>
        <div class="sync-panel-actions">
          <span class="sync-restore-state">{{ canRestore ? 'ready to restore' : 'not ready' }}</span>
          <button
            class="quiet-button"
            type="button"
            :disabled="!canRestore"
            @click="restoreImport"
          >
            Restore workspace
          </button>
        </div>
      </div>

      <div class="sync-import-grid">
        <label>
          Workspace package JSON
          <textarea
            :value="syncState.workspaceJson"
            readonly
            aria-label="Workspace package JSON"
          />
        </label>
        <label>
          Import workspace JSON
          <textarea
            :value="importText"
            aria-label="Import workspace JSON"
            @input="updateImportText"
          />
        </label>
      </div>

      <div class="sync-preview">
        <p v-if="restoreStatus">{{ restoreStatus }}</p>
        <p>
          create {{ importState.preview?.createCount ?? 0 }} ·
          update {{ importState.preview?.updateCount ?? 0 }}
        </p>
        <ul>
          <li v-for="issue in importState.issues" :key="issue.code + issue.detail">
            {{ issue.severity }} · {{ issue.title }} · {{ issue.detail }}
          </li>
        </ul>
      </div>
    </section>

    <section class="sync-panel sync-export" aria-label="Workspace PR bundle">
      <div class="sync-panel-head">
        <div>
          <p class="muted">handoff</p>
          <h2>PR bundle</h2>
        </div>
        <CopyButton :text="syncState.prBundleMarkdown" label="Copy Markdown" />
      </div>
      <textarea :value="syncState.prBundleMarkdown" readonly aria-label="Workspace markdown" />
    </section>
  </main>
</template>
