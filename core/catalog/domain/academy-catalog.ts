export const CATALOG_CONTRACT_VERSION = 'academy-catalog/v1'

export interface CatalogMaterial {
  kind: string
  label: string
  path: string
}

export interface CatalogReadinessItem {
  label: string
  status: string
  detail: string
}

export interface CatalogLaunchRoute {
  code: string
  title: string
  description: string
  timebox: string
  session_route: string
  mentor_command: string
  student_command: string
  check_command: string
}

export interface CatalogPlatformProfile {
  code: string
  title: string
  checks: string[]
  notes: string[]
}

export interface CatalogLessonLauncher {
  lab: string
  default_route: string
  default_platform: string
  default_output_dir: string
  routes: CatalogLaunchRoute[]
  platforms: CatalogPlatformProfile[]
}

export interface CatalogLesson {
  code: string
  title: string
  summary: string
  level: string
  duration: string
  status: string
  readiness: CatalogReadinessItem[]
  materials: CatalogMaterial[]
  mentor_commands: string[]
  student_commands: string[]
  next_lesson_code?: string | null
  launcher?: CatalogLessonLauncher
}

export interface CatalogTrack {
  code: string
  title: string
  description: string
  status: string
  lessons: CatalogLesson[]
}

export interface AcademyCatalog {
  contract_version: typeof CATALOG_CONTRACT_VERSION
  generated_at: string
  default_track: string
  tracks: CatalogTrack[]
}
