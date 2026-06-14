export const CONTROL_PLANE_VERSION = 'academy-control-plane/v1'

export interface StageGuide {
  stage_code: string
  slides: string
  mentor_script: string
  show_commands: string[]
  question: string
  expected_answer: string
  verification: string
  workbook_ref: string
  homework_ref: string
}

export interface MentorMode {
  default_route: string
  runbook_commands: string[]
  slide_deck: string
  google_slides?: string | null
  stage_guides: StageGuide[]
}

export interface StudentMode {
  prep_runbook: string
  workbook: string
  homework: string
  self_check_commands: string[]
}

export interface PortalActions {
  start_command: string
  export_command: string
  open_command: string
}

export interface ControlPlaneArtifact {
  kind: string
  path: string
  label: string
}

export interface NextLesson {
  code: string
  title: string
  path: string
}

export interface AcademyControlPlane {
  version: typeof CONTROL_PLANE_VERSION
  mentor_mode: MentorMode
  student_mode: StudentMode
  portal_actions: PortalActions
  artifacts: ControlPlaneArtifact[]
  next_lesson: NextLesson
}
