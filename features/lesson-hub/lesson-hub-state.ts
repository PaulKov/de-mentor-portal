import type {
  AcademyCatalog,
  CatalogLesson,
  CatalogTrack
} from '../../core/catalog/domain/academy-catalog.ts'

export type LessonHubRole = 'mentor' | 'student'

export interface LessonHubPreferences {
  trackCode?: string
  lessonCode?: string
  role?: unknown
}

export interface TrackSummary {
  code: string
  title: string
  status: string
  lessonCount: number
  readyCount: number
}

export interface LessonHubState {
  trackSummaries: TrackSummary[]
  selectedTrack: CatalogTrack
  selectedLesson: CatalogLesson
  selectedRole: LessonHubRole
  selectedCommands: string[]
}

export const createLessonHubStorageKey = (catalog: AcademyCatalog) =>
  ['academy-lesson-hub', catalog.contract_version, catalog.generated_at].join(':')

export const normalizeLessonHubRole = (role: unknown): LessonHubRole =>
  role === 'student' ? 'student' : 'mentor'

export const buildLessonHubState = (
  catalog: AcademyCatalog,
  preferences: LessonHubPreferences = {}
): LessonHubState => {
  const selectedRole = normalizeLessonHubRole(preferences.role)
  const selectedTrack = selectTrack(catalog, preferences.trackCode)
  const selectedLesson = selectLesson(selectedTrack, preferences.lessonCode)

  return {
    trackSummaries: catalog.tracks.map(toTrackSummary),
    selectedTrack,
    selectedLesson,
    selectedRole,
    selectedCommands: commandsForRole(selectedLesson, selectedRole)
  }
}

const selectTrack = (catalog: AcademyCatalog, trackCode?: string) =>
  catalog.tracks.find(track => track.code === trackCode) ??
  catalog.tracks.find(track => track.code === catalog.default_track) ??
  catalog.tracks[0]

const selectLesson = (track: CatalogTrack, lessonCode?: string) =>
  track.lessons.find(lesson => lesson.code === lessonCode) ?? track.lessons[0]

const toTrackSummary = (track: CatalogTrack): TrackSummary => ({
  code: track.code,
  title: track.title,
  status: track.status,
  lessonCount: track.lessons.length,
  readyCount: track.lessons.filter(lesson => lesson.status === 'ready').length
})

const commandsForRole = (lesson: CatalogLesson, role: LessonHubRole) =>
  role === 'student' ? lesson.student_commands : lesson.mentor_commands
