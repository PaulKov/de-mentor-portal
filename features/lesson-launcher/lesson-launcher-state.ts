import type {
  CatalogLaunchRoute,
  CatalogPlatformProfile,
  CatalogLesson,
  CatalogTrack
} from '../../core/catalog/domain/academy-catalog.ts'

export interface LessonLaunchPreferences {
  studentName?: string
  routeCode?: string
  platformCode?: string
  outputDir?: string
}

export interface LessonLaunchCommand {
  label: string
  command: string
}

export interface LessonLauncherState {
  isAvailable: boolean
  studentName: string
  outputDir: string
  routes: CatalogLaunchRoute[]
  platforms: CatalogPlatformProfile[]
  selectedRoute?: CatalogLaunchRoute
  selectedPlatform?: CatalogPlatformProfile
  platformChecks: string[]
  platformNotes: string[]
  sessionCommand: string
  commands: LessonLaunchCommand[]
}

const DEFAULT_STUDENT_NAME = 'Demo Student'

export const createLessonLauncherStorageKey = (
  track: CatalogTrack,
  lesson: CatalogLesson,
  catalogGeneratedAt: string
) => ['lesson-launcher', catalogGeneratedAt, track.code, lesson.code].join(':')

export const buildLessonLauncherState = (
  _track: CatalogTrack,
  lesson: CatalogLesson,
  preferences: LessonLaunchPreferences = {}
): LessonLauncherState => {
  if (!lesson.launcher) {
    return emptyState(preferences)
  }

  const selectedRoute =
    lesson.launcher.routes.find(route => route.code === preferences.routeCode) ??
    lesson.launcher.routes.find(route => route.code === lesson.launcher?.default_route) ??
    lesson.launcher.routes[0]
  const selectedPlatform =
    lesson.launcher.platforms.find(platform => platform.code === preferences.platformCode) ??
    lesson.launcher.platforms.find(platform => platform.code === lesson.launcher?.default_platform) ??
    lesson.launcher.platforms[0]
  const studentName = normalizeText(preferences.studentName, DEFAULT_STUDENT_NAME)
  const outputDir = normalizeText(preferences.outputDir, lesson.launcher.default_output_dir)
  const sessionCommand = buildSessionCommand(
    lesson.launcher.lab,
    selectedRoute.session_route,
    studentName,
    outputDir
  )

  return {
    isAvailable: true,
    studentName,
    outputDir,
    routes: lesson.launcher.routes,
    platforms: lesson.launcher.platforms,
    selectedRoute,
    selectedPlatform,
    platformChecks: selectedPlatform.checks,
    platformNotes: selectedPlatform.notes,
    sessionCommand,
    commands: [
      { label: 'Create session', command: sessionCommand },
      { label: 'Mentor runbook', command: selectedRoute.mentor_command },
      { label: 'Student runbook', command: selectedRoute.student_command },
      { label: 'Self-check', command: selectedRoute.check_command }
    ]
  }
}

const emptyState = (preferences: LessonLaunchPreferences): LessonLauncherState => ({
  isAvailable: false,
  studentName: normalizeText(preferences.studentName, DEFAULT_STUDENT_NAME),
  outputDir: normalizeText(preferences.outputDir, ''),
  routes: [],
  platforms: [],
  platformChecks: [],
  platformNotes: [],
  sessionCommand: '',
  commands: []
})

const buildSessionCommand = (
  lab: string,
  route: string,
  studentName: string,
  outputDir: string
) => [
  'python3 mentor-lab.py session',
  lab,
  'start',
  '--student',
  quoteShell(studentName),
  '--route',
  route,
  '--output',
  outputDir
].join(' ')

const normalizeText = (value: string | undefined, fallback: string) => {
  const normalized = value?.trim()
  return normalized ? normalized : fallback
}

const quoteShell = (value: string) =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
