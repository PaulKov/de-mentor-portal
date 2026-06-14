<script setup lang="ts">
import { computed, toRef } from 'vue'
import type { ValidationIssue } from '~/core/session/application/session-contract'
import type { AcademySession } from '~/core/session/domain/academy-session'
import CommandList from '~/features/commands/CommandList.vue'
import ControlPlanePanel from '~/features/control-plane/ControlPlanePanel.vue'
import EvidenceChecklist from '~/features/evidence/EvidenceChecklist.vue'
import MentorCockpit from '~/features/mentor-cockpit/MentorCockpit.vue'
import SessionStatusBanner from '~/features/session-status/SessionStatusBanner.vue'
import SkillGraphPanel from '~/features/skill-graph/SkillGraphPanel.vue'
import StudentLaunchpad from '~/features/student-launchpad/StudentLaunchpad.vue'
import SessionTimeline from '~/features/timeline/SessionTimeline.vue'
import AppShell from '~/components/shared/ui/AppShell.vue'
import CopyCommand from '~/components/shared/ui/CopyCommand.vue'
import Panel from '~/components/shared/ui/Panel.vue'
import { useSessionDashboardMode } from './useSessionDashboardMode'

const props = defineProps<{
  session: AcademySession | null
  source: string
  issues: ValidationIssue[]
  isValid: boolean
  canOpenHub?: boolean
  canOpenWorkspace?: boolean
  canOpenReview?: boolean
  canOpenSubmission?: boolean
  canOpenCohort?: boolean
}>()

defineEmits<{
  reload: []
  'open-hub': []
  'open-workspace': []
  'open-review': []
  'open-submission': []
  'open-cohort': []
}>()

const stages = computed(() => props.session?.stages ?? [])
const currentStage = computed(() => props.session?.current_stage)
const sessionRef = toRef(props, 'session')
const { mode, selectMode } = useSessionDashboardMode(sessionRef)
const nextStage = computed(() => {
  if (!props.session || !currentStage.value) {
    return undefined
  }

  const index = props.session.stages.findIndex(
    stage => stage.code === currentStage.value?.code
  )
  return props.session.stages[index + 1]
})
</script>

<template>
  <MentorCockpit
    v-if="session && isValid && mode === 'mentor'"
    :session="session"
    :source="source"
    :issues="issues"
    :is-valid="isValid"
    :active-mode="mode"
    :can-open-hub="canOpenHub"
    :can-open-workspace="canOpenWorkspace"
    :can-open-review="canOpenReview"
    :can-open-submission="canOpenSubmission"
    :can-open-cohort="canOpenCohort"
    @select-mode="selectMode"
    @reload="$emit('reload')"
    @open-hub="$emit('open-hub')"
    @open-workspace="$emit('open-workspace')"
    @open-review="$emit('open-review')"
    @open-submission="$emit('open-submission')"
    @open-cohort="$emit('open-cohort')"
  />

  <StudentLaunchpad
    v-else-if="session && isValid"
    :session="session"
    :source="source"
    :issues="issues"
    :is-valid="isValid"
    :active-mode="mode"
    :can-open-hub="canOpenHub"
    :can-open-workspace="canOpenWorkspace"
    :can-open-review="canOpenReview"
    :can-open-submission="canOpenSubmission"
    :can-open-cohort="canOpenCohort"
    @select-mode="selectMode"
    @reload="$emit('reload')"
    @open-hub="$emit('open-hub')"
    @open-workspace="$emit('open-workspace')"
    @open-review="$emit('open-review')"
    @open-submission="$emit('open-submission')"
    @open-cohort="$emit('open-cohort')"
  />

  <AppShell
    v-else
    :stages="stages"
    :current-stage-code="currentStage?.code"
    :framework="session?.portal.framework"
    :source="source"
  >
    <template v-if="canOpenHub" #portal-actions>
      <button class="quiet-button portal-action-button" type="button" @click="$emit('open-hub')">
        Вернуться в каталог
      </button>
      <button
        v-if="canOpenWorkspace"
        class="quiet-button portal-action-button"
        type="button"
        @click="$emit('open-workspace')"
      >
        Открыть сессии
      </button>
      <button
        v-if="canOpenReview"
        class="quiet-button portal-action-button"
        type="button"
        @click="$emit('open-review')"
      >
        Открыть review
      </button>
      <button
        v-if="canOpenSubmission"
        class="quiet-button portal-action-button"
        type="button"
        @click="$emit('open-submission')"
      >
        Открыть submissions
      </button>
      <button
        v-if="canOpenCohort"
        class="quiet-button portal-action-button"
        type="button"
        @click="$emit('open-cohort')"
      >
        Открыть cohort
      </button>
    </template>

    <header class="topbar">
      <div>
        <p class="muted">Greenplum mentor cockpit</p>
        <h1>{{ session?.student_name || 'Demo Student' }} · {{ session?.lab_name || 'greenplum' }}</h1>
      </div>
      <SessionStatusBanner
        class="topbar-status"
        :is-valid="isValid"
        :source="source"
        :issues="issues"
        @reload="$emit('reload')"
      />
    </header>

    <section id="current-stage" class="hero current-stage" aria-label="Текущий этап">
      <div>
        <p class="muted">current stage</p>
        <h2>{{ currentStage?.title || 'Сессия еще не загружена' }}</h2>
        <p>{{ currentStage?.mentor_focus || 'Проверьте session.json и обновите state.' }}</p>
      </div>
      <div v-if="currentStage" class="stage-command">
        <span>{{ currentStage.timebox }}</span>
        <CopyCommand
          class="copy-command"
          title="Команда этапа"
          :command="currentStage.command"
        />
      </div>
    </section>

    <div class="workspace-grid">
      <SessionTimeline :stages="stages" />
      <CommandList :commands="session?.commands ?? []" />
    </div>

    <ControlPlanePanel
      :control-plane="session?.control_plane"
      :current-stage="currentStage"
    />

    <div class="workspace-grid lower-grid">
      <SkillGraphPanel :nodes="session?.skill_graph ?? []" />
      <EvidenceChecklist />
    </div>

    <Panel class="report-panel">
      <div>
        <p class="muted">handoff</p>
        <h2>Финальный отчет и следующий шаг</h2>
        <p>
          После урока запиши события и собери отчет командой
          <code>mentor-lab.py session greenplum report</code>.
        </p>
        <p v-if="nextStage">
          Следующий этап маршрута: <strong>{{ nextStage.title }}</strong>.
        </p>
      </div>
      <CopyCommand
        class="copy-command"
        title="Session report"
        command="python3 mentor-lab.py session greenplum report --session artifacts/sessions/<name> --output artifacts/greenplum-session-report.md"
      />
    </Panel>
  </AppShell>
</template>
