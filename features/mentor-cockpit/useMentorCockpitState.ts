import { computed, ref, watch, type Ref } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import { buildMentorCockpitState } from './mentor-cockpit-state'

export const useMentorCockpitState = (session: Ref<AcademySession>) => {
  const selectedStageCode = ref(session.value.current_stage.code)

  watch(
    () => session.value.current_stage.code,
    stageCode => {
      selectedStageCode.value = stageCode
    }
  )

  const cockpitState = computed(() =>
    buildMentorCockpitState(session.value, selectedStageCode.value)
  )

  const selectStage = (stageCode: string) => {
    selectedStageCode.value = stageCode
  }

  return {
    cockpitState,
    selectedStageCode,
    selectStage
  }
}
