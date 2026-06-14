import type { AcademySession, AcademyStage, SkillNode } from '../../core/session/domain/academy-session.ts'
import type { StageGuide } from '../../core/session/domain/control-plane.ts'

export type ReleaseSignal = 'ready' | 'warning'

export interface ReleaseStatus {
  session: ReleaseSignal
  controlPlane: ReleaseSignal
  slides: ReleaseSignal
  commands: ReleaseSignal
}

export interface SelectedStageState {
  stage: AcademyStage
  guide?: StageGuide
}

export interface MentorCockpitState {
  stages: AcademyStage[]
  selectedStage: AcademyStage
  selectedGuide?: StageGuide
  commands: string[]
  evidenceItems: SkillNode[]
  googleSlidesUrl?: string
  slideDeck?: string
  slideLabel: string
  releaseStatus: ReleaseStatus
}

export const createMentorStorageKey = (session: AcademySession) =>
  [
    'mentor-cockpit',
    session.contract_version,
    session.lab_name,
    session.student_name,
    session.created_at
  ].join(':')

export const buildMentorCockpitState = (
  session: AcademySession,
  selectedStageCode?: string
): MentorCockpitState => {
  const selectedStage = selectStage(session, selectedStageCode)
  const selectedGuide = findGuide(session, selectedStage.code)
  const commands = uniqueCommands([
    ...(selectedGuide?.show_commands ?? []),
    selectedStage.command,
    ...session.commands
  ])
  const googleSlidesUrl = session.control_plane?.mentor_mode.google_slides ?? undefined
  const slideDeck = session.control_plane?.mentor_mode.slide_deck

  return {
    stages: session.stages,
    selectedStage,
    selectedGuide,
    commands,
    evidenceItems: session.skill_graph,
    googleSlidesUrl,
    slideDeck,
    slideLabel: selectedGuide?.slides ? `Slides ${selectedGuide.slides}` : 'Slides unavailable',
    releaseStatus: {
      session: session.stages.length > 0 ? 'ready' : 'warning',
      controlPlane: session.control_plane ? 'ready' : 'warning',
      slides: googleSlidesUrl || slideDeck ? 'ready' : 'warning',
      commands: commands.length > 0 ? 'ready' : 'warning'
    }
  }
}

const selectStage = (session: AcademySession, selectedStageCode?: string) =>
  session.stages.find(stage => stage.code === selectedStageCode) ?? session.current_stage

const findGuide = (session: AcademySession, stageCode: string) =>
  session.control_plane?.mentor_mode.stage_guides.find(guide => guide.stage_code === stageCode)

const uniqueCommands = (commands: string[]) =>
  Array.from(new Set(commands.filter(command => command.trim().length > 0)))
