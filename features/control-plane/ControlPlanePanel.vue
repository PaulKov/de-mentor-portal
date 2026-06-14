<script setup lang="ts">
import { computed } from 'vue'
import type { AcademyControlPlane, StageGuide } from '~/core/session/domain/control-plane'
import type { AcademyStage } from '~/core/session/domain/academy-session'
import CopyCommand from '~/components/shared/ui/CopyCommand.vue'
import Panel from '~/components/shared/ui/Panel.vue'

const props = defineProps<{
  controlPlane?: AcademyControlPlane
  currentStage?: AcademyStage
}>()

const currentGuide = computed<StageGuide | undefined>(() => {
  const guides = props.controlPlane?.mentor_mode.stage_guides ?? []
  return guides.find(guide => guide.stage_code === props.currentStage?.code) ?? guides[0]
})

const portalCommands = computed(() => {
  const actions = props.controlPlane?.portal_actions
  return actions ? [actions.start_command, actions.export_command, actions.open_command] : []
})
</script>

<template>
  <Panel
    v-if="controlPlane && currentGuide"
    class="control-plane-panel"
    eyebrow="control plane"
    title="Academy Control Plane"
  >
    <div class="control-plane-grid">
      <section class="control-plane-section">
        <p class="muted">stage guide</p>
        <h3>{{ currentStage?.title || currentGuide.stage_code }}</h3>
        <strong>Слайды {{ currentGuide.slides }}</strong>
        <p>{{ currentGuide.mentor_script }}</p>
        <dl>
          <div>
            <dt>Вопрос</dt>
            <dd>{{ currentGuide.question }}</dd>
          </div>
          <div>
            <dt>Проверка</dt>
            <dd>{{ currentGuide.verification }}</dd>
          </div>
        </dl>
      </section>

      <section class="control-plane-section">
        <p class="muted">portal actions</p>
        <CopyCommand
          v-for="command in portalCommands"
          :key="command"
          title="Portal command"
          :command="command"
        />
      </section>
    </div>

    <div class="control-plane-links">
      <span>{{ controlPlane.student_mode.workbook }}</span>
      <span>{{ controlPlane.student_mode.homework }}</span>
      <span>{{ controlPlane.next_lesson.code }} · {{ controlPlane.next_lesson.title }}</span>
    </div>
  </Panel>
</template>
