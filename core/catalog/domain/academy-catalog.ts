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
