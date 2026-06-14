<script setup lang="ts">
import { toRef } from 'vue'
import type { ValidationIssue } from '~/core/session/application/session-contract'
import type { AcademySession } from '~/core/session/domain/academy-session'
import AppShell from '~/components/shared/ui/AppShell.vue'
import DashboardModeSwitch from '~/features/session-dashboard/DashboardModeSwitch.vue'
import type { DashboardMode } from '~/features/session-dashboard/session-dashboard-mode'
import SessionStatusBanner from '~/features/session-status/SessionStatusBanner.vue'
import EvidencePanel from './EvidencePanel.vue'
import ReleaseStatusStrip from './ReleaseStatusStrip.vue'
import SlideCommandRail from './SlideCommandRail.vue'
import StagePlayer from './StagePlayer.vue'
import { useMentorCockpitState } from './useMentorCockpitState'

const props = defineProps<{
  session: AcademySession
  source: string
  issues: ValidationIssue[]
  isValid: boolean
  activeMode: DashboardMode
  canOpenHub?: boolean
  canOpenWorkspace?: boolean
  canOpenReview?: boolean
}>()

const emit = defineEmits<{
  reload: []
  'select-mode': [mode: DashboardMode]
  'open-hub': []
  'open-workspace': []
  'open-review': []
}>()

const sessionRef = toRef(props, 'session')
const {
  checkedEvidence,
  cockpitState,
  currentStageNote,
  selectStage,
  toggleEvidence,
  updateCurrentStageNote
} = useMentorCockpitState(sessionRef)
</script>

<template>
  <AppShell
    :stages="cockpitState.stages"
    :current-stage-code="cockpitState.selectedStage.code"
    :framework="session.portal.framework"
    :source="source"
  >
    <template v-if="canOpenHub" #portal-actions>
      <button class="quiet-button portal-action-button" type="button" @click="emit('open-hub')">
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
        v-if="canOpenReview"
        class="quiet-button portal-action-button"
        type="button"
        @click="emit('open-review')"
      >
        Открыть review
      </button>
    </template>

    <header class="topbar cockpit-topbar">
      <div>
        <p class="muted">Greenplum mentor cockpit</p>
        <h1>Mentor Live Cockpit</h1>
        <p>{{ session.student_name }} · {{ session.lab_name }}</p>
      </div>
      <div class="topbar-actions">
        <DashboardModeSwitch
          :active-mode="activeMode"
          @select-mode="emit('select-mode', $event)"
        />
        <SessionStatusBanner
          class="topbar-status"
          :is-valid="isValid"
          :source="source"
          :issues="issues"
          @reload="emit('reload')"
        />
      </div>
    </header>

    <ReleaseStatusStrip :status="cockpitState.releaseStatus" />

    <div class="cockpit-layout">
      <div class="cockpit-main">
        <StagePlayer
          :state="cockpitState"
          @select-stage="selectStage"
        />
      </div>

      <SlideCommandRail :state="cockpitState" />
      <EvidencePanel
        :session="session"
        :state="cockpitState"
        :checked-evidence="checkedEvidence"
        :stage-note="currentStageNote"
        @toggle-evidence="toggleEvidence"
        @update-stage-note="updateCurrentStageNote"
      />
    </div>
  </AppShell>
</template>
