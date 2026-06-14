<script setup lang="ts">
import { toRef } from 'vue'
import type { ValidationIssue } from '~/core/session/application/session-contract'
import type { AcademySession } from '~/core/session/domain/academy-session'
import AppShell from '~/components/shared/ui/AppShell.vue'
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
}>()

defineEmits<{
  reload: []
}>()

const sessionRef = toRef(props, 'session')
const { cockpitState, selectStage } = useMentorCockpitState(sessionRef)
</script>

<template>
  <AppShell
    :stages="cockpitState.stages"
    :current-stage-code="cockpitState.selectedStage.code"
    :framework="session.portal.framework"
    :source="source"
  >
    <header class="topbar cockpit-topbar">
      <div>
        <p class="muted">Greenplum mentor cockpit</p>
        <h1>Mentor Live Cockpit</h1>
        <p>{{ session.student_name }} · {{ session.lab_name }}</p>
      </div>
      <SessionStatusBanner
        class="topbar-status"
        :is-valid="isValid"
        :source="source"
        :issues="issues"
        @reload="$emit('reload')"
      />
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
      <EvidencePanel :session="session" :state="cockpitState" />
    </div>
  </AppShell>
</template>
