<script setup lang="ts">
import { toRef } from 'vue'
import type { ValidationIssue } from '~/core/session/application/session-contract'
import type { AcademySession } from '~/core/session/domain/academy-session'
import AppShell from '~/components/shared/ui/AppShell.vue'
import Panel from '~/components/shared/ui/Panel.vue'
import DashboardModeSwitch from '~/features/session-dashboard/DashboardModeSwitch.vue'
import type { DashboardMode } from '~/features/session-dashboard/session-dashboard-mode'
import SessionStatusBanner from '~/features/session-status/SessionStatusBanner.vue'
import PlatformReadinessPanel from './PlatformReadinessPanel.vue'
import StudentCommandChecklist from './StudentCommandChecklist.vue'
import StudentResourceRail from './StudentResourceRail.vue'
import { useStudentLaunchpadState } from './useStudentLaunchpadState'

const props = defineProps<{
  session: AcademySession
  source: string
  issues: ValidationIssue[]
  isValid: boolean
  activeMode: DashboardMode
}>()

const emit = defineEmits<{
  reload: []
  'select-mode': [mode: DashboardMode]
}>()

const sessionRef = toRef(props, 'session')
const { launchpadState, selectPlatform } = useStudentLaunchpadState(sessionRef)
</script>

<template>
  <AppShell
    :stages="session.stages"
    :current-stage-code="session.current_stage.code"
    :framework="session.portal.framework"
    :source="source"
  >
    <header class="topbar student-topbar">
      <div>
        <p class="muted">student self-service</p>
        <h1>Student Launchpad</h1>
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

    <div class="student-launchpad-grid">
      <PlatformReadinessPanel
        :state="launchpadState"
        @select-platform="selectPlatform"
      />
      <StudentResourceRail :state="launchpadState" />
    </div>

    <StudentCommandChecklist :state="launchpadState" />

    <Panel class="student-handoff" eyebrow="handoff" title="Что принести на урок">
      <ul>
        <li v-for="item in launchpadState.handoffItems" :key="item">
          {{ item }}
        </li>
      </ul>
    </Panel>
  </AppShell>
</template>
