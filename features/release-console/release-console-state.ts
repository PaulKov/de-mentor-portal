import type {
  AcademyCatalog,
  CatalogLesson,
  CatalogMaterial,
  CatalogTrack
} from '../../core/catalog/domain/academy-catalog.ts'
import type {
  AcademySession
} from '../../core/session/domain/academy-session.ts'

export type ReleaseGoNoGo = 'go' | 'watch' | 'blocked'
export type ReleaseCheckStatus = 'ready' | 'review' | 'missing'

export interface ReleasePreferences {
  trackCode?: string
  lessonCode?: string
}

export interface ReleaseCheck {
  label: string
  status: ReleaseCheckStatus
  detail: string
  evidence: string[]
}

export interface ReleaseArtifact {
  kind: string
  label: string
  path: string
  source: 'catalog' | 'session'
}

export interface ReleaseLessonCard {
  id: string
  trackCode: string
  trackTitle: string
  lessonCode: string
  lessonTitle: string
  lessonStatus: string
  goNoGo: ReleaseGoNoGo
  readinessPercent: number
  checks: ReleaseCheck[]
  artifacts: ReleaseArtifact[]
  commands: string[]
  risks: string[]
}

export interface ReleaseSummary {
  lessonCount: number
  goCount: number
  watchCount: number
  blockedCount: number
}

export interface ReleaseConsoleState {
  selectedTrack: CatalogTrack
  selectedLesson: ReleaseLessonCard
  trackSummaries: Array<{ code: string; title: string; status: string; lessonCount: number }>
  lessons: ReleaseLessonCard[]
  visibleLessons: ReleaseLessonCard[]
  summary: ReleaseSummary
  reportMarkdown: string
}

const ESSENTIAL_CHECKS = new Set([
  'Lesson status',
  'Google Slides / deck',
  'Workbook',
  'Homework',
  'Runbook commands',
  'Launcher'
])

export const createReleaseConsoleStorageKey = (catalog: AcademyCatalog) =>
  ['lesson-release-console', catalog.contract_version, catalog.generated_at].join(':')

export const normalizeReleasePreferences = (
  catalog: AcademyCatalog,
  preferences: ReleasePreferences = {}
): Required<ReleasePreferences> => {
  const selectedTrack =
    catalog.tracks.find(track => track.code === preferences.trackCode) ??
    catalog.tracks.find(track => track.code === catalog.default_track) ??
    catalog.tracks[0]
  const selectedLesson =
    selectedTrack.lessons.find(lesson => lesson.code === preferences.lessonCode) ??
    selectedTrack.lessons[0]

  return {
    trackCode: selectedTrack.code,
    lessonCode: selectedLesson.code
  }
}

export const buildReleaseConsoleState = (
  catalog: AcademyCatalog,
  session: AcademySession | null = null,
  preferences: ReleasePreferences = {}
): ReleaseConsoleState => {
  const sessionMatch = findLessonForSession(catalog, session)
  const normalized = normalizeReleasePreferences(catalog, {
    trackCode: preferences.trackCode ?? sessionMatch?.track.code,
    lessonCode: preferences.lessonCode ?? sessionMatch?.lesson.code
  })
  const lessons = catalog.tracks.flatMap(track =>
    track.lessons.map(lesson =>
      createReleaseLessonCard(track, lesson, isSessionLesson(lesson, session) ? session : null)
    )
  )
  const selectedTrack = catalog.tracks.find(track => track.code === normalized.trackCode) ?? catalog.tracks[0]
  const selectedLesson =
    lessons.find(lesson =>
      lesson.trackCode === normalized.trackCode &&
      lesson.lessonCode === normalized.lessonCode
    ) ?? lessons[0]
  const visibleLessons = lessons.filter(lesson => lesson.trackCode === selectedTrack.code)
  const state = {
    selectedTrack,
    selectedLesson,
    trackSummaries: catalog.tracks.map(track => ({
      code: track.code,
      title: track.title,
      status: track.status,
      lessonCount: track.lessons.length
    })),
    lessons,
    visibleLessons,
    summary: createSummary(lessons),
    reportMarkdown: ''
  }

  return {
    ...state,
    reportMarkdown: createReleaseReportMarkdown(state)
  }
}

const createReleaseLessonCard = (
  track: CatalogTrack,
  lesson: CatalogLesson,
  session: AcademySession | null
): ReleaseLessonCard => {
  const artifacts = createArtifacts(lesson.materials, session)
  const commands = uniqueStrings([
    ...lesson.mentor_commands,
    ...lesson.student_commands,
    ...(lesson.launcher?.routes.flatMap(route => [
      route.mentor_command,
      route.student_command,
      route.check_command
    ]) ?? []),
    ...(session?.commands ?? []),
    ...(session?.control_plane?.mentor_mode.runbook_commands ?? []),
    ...(session?.control_plane?.student_mode.self_check_commands ?? []),
    'npm run check',
    'npm run build'
  ])
  const checks = createChecks(lesson, session, artifacts, commands)
  const risks = createRisks(lesson, checks)
  const goNoGo = createGoNoGo(checks, risks)

  return {
    id: `${track.code}:${lesson.code}`,
    trackCode: track.code,
    trackTitle: track.title,
    lessonCode: lesson.code,
    lessonTitle: lesson.title,
    lessonStatus: lesson.status,
    goNoGo,
    readinessPercent: Math.round(
      checks.filter(check => check.status === 'ready').length / checks.length * 100
    ),
    checks,
    artifacts,
    commands,
    risks
  }
}

const createChecks = (
  lesson: CatalogLesson,
  session: AcademySession | null,
  artifacts: ReleaseArtifact[],
  commands: string[]
): ReleaseCheck[] => [
  {
    label: 'Lesson status',
    status: lesson.status === 'ready' ? 'ready' : 'missing',
    detail: lesson.status === 'ready' ? 'Урок помечен ready.' : `Lesson status is ${lesson.status}.`,
    evidence: [`catalog.status=${lesson.status}`]
  },
  {
    label: 'Catalog readiness',
    status: lesson.readiness.length === 0
      ? 'missing'
      : lesson.readiness.every(item => item.status === 'ready') ? 'ready' : 'review',
    detail: `${lesson.readiness.length} readiness markers in catalog.`,
    evidence: lesson.readiness.map(item => `${item.label}: ${item.status}`)
  },
  artifactCheck('Google Slides / deck', artifacts, ['deck']),
  artifactCheck('Workbook', artifacts, ['workbook']),
  artifactCheck('Homework', artifacts, ['homework']),
  artifactCheck('SQL lab', artifacts, ['sql']),
  {
    label: 'Runbook commands',
    status: hasRunbookCoverage(commands, session) ? 'ready' : 'missing',
    detail: 'Mentor/student runbooks and self-check commands are copyable.',
    evidence: commands.filter(command => /runbook|lesson-release|doctor/.test(command)).slice(0, 5)
  },
  {
    label: 'Launcher',
    status: lesson.launcher ? 'ready' : 'missing',
    detail: lesson.launcher
      ? `${lesson.launcher.routes.length} routes, ${lesson.launcher.platforms.length} platforms.`
      : 'Lesson launcher is not configured.',
    evidence: lesson.launcher?.routes.map(route => `${route.code}: ${route.timebox}`) ?? []
  }
]

const artifactCheck = (
  label: string,
  artifacts: ReleaseArtifact[],
  kinds: string[]
): ReleaseCheck => {
  const matches = artifacts.filter(artifact => kinds.includes(artifact.kind))

  return {
    label,
    status: matches.length > 0 ? 'ready' : 'missing',
    detail: matches.length > 0 ? `${matches.length} artifact(s) connected.` : `${label} artifact is missing.`,
    evidence: matches.map(artifact => artifact.path)
  }
}

const createArtifacts = (
  materials: CatalogMaterial[],
  session: AcademySession | null
): ReleaseArtifact[] => uniqueArtifacts([
  ...materials.map(material => ({
    kind: material.kind,
    label: material.label,
    path: material.path,
    source: 'catalog' as const
  })),
  ...(session?.control_plane?.artifacts.map(artifact => ({
    kind: artifact.kind,
    label: artifact.label,
    path: artifact.path,
    source: 'session' as const
  })) ?? []),
  ...sessionArtifacts(session)
])

const sessionArtifacts = (session: AcademySession | null): ReleaseArtifact[] => {
  if (!session?.control_plane) {
    return []
  }

  return [
    {
      kind: 'deck',
      label: 'PPTX deck',
      path: session.control_plane.mentor_mode.slide_deck,
      source: 'session'
    },
    {
      kind: 'deck',
      label: 'Google Slides',
      path: session.control_plane.mentor_mode.google_slides ?? '',
      source: 'session'
    },
    {
      kind: 'workbook',
      label: 'Student workbook',
      path: session.control_plane.student_mode.workbook,
      source: 'session'
    },
    {
      kind: 'homework',
      label: 'Homework',
      path: session.control_plane.student_mode.homework,
      source: 'session'
    },
    {
      kind: 'runbook',
      label: 'Student prep',
      path: session.control_plane.student_mode.prep_runbook,
      source: 'session'
    }
  ].filter(artifact => artifact.path)
}

const hasRunbookCoverage = (commands: string[], session: AcademySession | null) =>
  commands.some(command => command.includes('runbook')) &&
  (
    commands.some(command => command.includes('lesson-release')) ||
    commands.some(command => command.includes('homework')) ||
    Boolean(session?.control_plane?.student_mode.prep_runbook)
  )

const createRisks = (lesson: CatalogLesson, checks: ReleaseCheck[]) => [
  ...(lesson.status === 'ready' ? [] : [`Lesson status is ${lesson.status}.`]),
  ...checks
    .filter(check => check.status !== 'ready')
    .map(check => `${check.status === 'missing' ? 'Missing' : 'Review'} release check: ${check.label}.`)
]

const createGoNoGo = (checks: ReleaseCheck[], risks: string[]): ReleaseGoNoGo => {
  const hasEssentialMissing = checks.some(check =>
    ESSENTIAL_CHECKS.has(check.label) && check.status === 'missing'
  )

  if (hasEssentialMissing) {
    return 'blocked'
  }

  return risks.length > 0 ? 'watch' : 'go'
}

const createSummary = (lessons: ReleaseLessonCard[]): ReleaseSummary => ({
  lessonCount: lessons.length,
  goCount: lessons.filter(lesson => lesson.goNoGo === 'go').length,
  watchCount: lessons.filter(lesson => lesson.goNoGo === 'watch').length,
  blockedCount: lessons.filter(lesson => lesson.goNoGo === 'blocked').length
})

export const createReleaseReportMarkdown = (
  state: Pick<ReleaseConsoleState, 'selectedLesson' | 'summary'>
) => [
  '# Lesson Release Console',
  '',
  `Lesson: ${state.selectedLesson.lessonTitle}`,
  `Go/no-go: ${state.selectedLesson.goNoGo}`,
  `Readiness: ${state.selectedLesson.readinessPercent}%`,
  `Summary: ${state.summary.goCount} go, ${state.summary.watchCount} watch, ${state.summary.blockedCount} blocked`,
  '',
  '## Checks',
  ...state.selectedLesson.checks.map(check =>
    `- ${check.status}: ${check.label} — ${check.detail}`
  ),
  '',
  '## Commands',
  ...state.selectedLesson.commands.slice(0, 8).map(command => `- \`${command}\``),
  '',
  '## Risks',
  ...(state.selectedLesson.risks.length > 0
    ? state.selectedLesson.risks.map(risk => `- ${risk}`)
    : ['- No open release risks.']),
  ''
].join('\n')

const findLessonForSession = (catalog: AcademyCatalog, session: AcademySession | null) => {
  if (!session) {
    return null
  }

  for (const track of catalog.tracks) {
    const lesson = track.lessons.find(candidate => isSessionLesson(candidate, session))
    if (lesson) {
      return { track, lesson }
    }
  }

  return null
}

const isSessionLesson = (lesson: CatalogLesson, session: AcademySession | null) =>
  Boolean(session) && (
    lesson.code === session.lab_name ||
    lesson.launcher?.lab === session.lab_name
  )

const uniqueStrings = (values: string[]) =>
  [...new Set(values.map(value => value.trim()).filter(Boolean))]

const uniqueArtifacts = (artifacts: ReleaseArtifact[]) => {
  const seen = new Set<string>()

  return artifacts.filter(artifact => {
    const key = `${artifact.kind}:${artifact.path}`
    if (!artifact.path || seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}
