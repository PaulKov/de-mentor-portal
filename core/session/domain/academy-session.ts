import type { AcademyControlPlane } from './control-plane'

export const CONTRACT_VERSION = 'academy-session/v1'
export const PORTAL_FRAMEWORK = 'Vue 3 + Nuxt 3 + Vite'
export const PORTAL_REPOSITORY = 'https://github.com/PaulKov/de-mentor-portal'
export const PORTAL_APP_PATH = 'de-mentor-portal'
export const PORTAL_SESSION_ENV = 'MENTOR_LAB_SESSION'

export interface AcademyStage {
  code: string
  title: string
  timebox: string
  mentor_focus: string
  student_action: string
  command: string
}

export interface SkillNode {
  code: string
  title: string
  level: string
  evidence: string
}

export interface SessionEvent {
  event_type: string
  note: string
  created_at: string
}

export interface PortalMetadata {
  framework: typeof PORTAL_FRAMEWORK
  repository: typeof PORTAL_REPOSITORY
  app_path: typeof PORTAL_APP_PATH
  session_env: typeof PORTAL_SESSION_ENV
  dev_command: string
}

export interface AcademySession {
  contract_version: typeof CONTRACT_VERSION
  academy_version: string
  lab_name: string
  student_name: string
  created_at: string
  current_stage: AcademyStage
  stages: AcademyStage[]
  skill_graph: SkillNode[]
  commands: string[]
  events: SessionEvent[]
  control_plane?: AcademyControlPlane
  portal: PortalMetadata
}
