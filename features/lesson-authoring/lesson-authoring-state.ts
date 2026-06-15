import type {
  AcademyCatalog,
  CatalogLesson,
  CatalogTrack
} from '../../core/catalog/domain/academy-catalog.ts'

export type AuthoringSeverity = 'blocker' | 'warning' | 'ok'
export type AuthoringReadiness = 'ready' | 'needs-work' | 'blocked'
export interface LessonAuthoringStageDraft {
  code: string
  title: string
  durationMinutes: number
  mentorAction: string
  studentAction: string
  command: string
  question: string
  evidence: string
}

export interface LessonAuthoringDraft {
  title: string
  objective: string
  totalMinutes: number
  stages: LessonAuthoringStageDraft[]
  homeworkTasks: string[]
}
export interface LessonAuthoringInput {
  trackCode?: string
  lessonCode?: string
  draft?: Partial<LessonAuthoringDraft> | null
}
export interface AuthoringBlueprint {
  objective: string
  totalMinutes: number
  stageCount: number
  homeworkCount: number
}
export interface AuthoringStageRow extends LessonAuthoringStageDraft {
  index: number
  durationLabel: string
}
export interface AuthoringQualityCheck {
  code: string
  title: string
  detail: string
  severity: AuthoringSeverity
}
export interface AuthoringPreview {
  mentorRoute: string[]
  studentRoute: string[]
  missionControlImpact: string[]
}
export interface AuthoringExports {
  catalogPatchMarkdown: string
  lessonPackageJson: string
  sessionSeedJson: string
  qualityReportMarkdown: string
}
export interface LessonAuthoringState {
  title: string
  subtitle: string
  readiness: AuthoringReadiness
  readinessScore: number
  selectedTrack: CatalogTrack
  selectedLesson: CatalogLesson
  draft: LessonAuthoringDraft
  blueprint: AuthoringBlueprint
  stageRows: AuthoringStageRow[]
  qualityChecks: AuthoringQualityCheck[]
  preview: AuthoringPreview
  exports: AuthoringExports
}

export const createLessonAuthoringStorageKey = (
  catalog: AcademyCatalog,
  trackCode: string,
  lessonCode: string
) => ['lesson-authoring', catalog.contract_version, catalog.generated_at, trackCode, lessonCode].join(':')

export const normalizeLessonAuthoringDraft = (
  draft: Partial<LessonAuthoringDraft> | null | undefined
): Partial<LessonAuthoringDraft> => {
  if (!draft || typeof draft !== 'object') {
    return {}
  }

  return {
    ...optionalText('title', draft.title),
    ...optionalText('objective', draft.objective),
    ...optionalPositiveNumber('totalMinutes', draft.totalMinutes),
    ...optionalStages(draft.stages),
    ...optionalTextList('homeworkTasks', draft.homeworkTasks)
  }
}

export const buildLessonAuthoringState = (
  catalog: AcademyCatalog,
  input: LessonAuthoringInput = {}
): LessonAuthoringState => {
  const selectedTrack = selectTrack(catalog, input.trackCode)
  const selectedLesson = selectLesson(selectedTrack, input.lessonCode)
  const draft = mergeDraft(createDefaultDraft(selectedLesson), normalizeLessonAuthoringDraft(input.draft))
  const stageRows = draft.stages.map((stage, index) => ({
    ...stage,
    index: index + 1,
    durationLabel: `${stage.durationMinutes} min`
  }))
  const qualityChecks = createQualityChecks(selectedLesson, draft)
  const blockerCount = countBySeverity(qualityChecks, 'blocker')
  const warningCount = countBySeverity(qualityChecks, 'warning')
  const readinessScore = clampScore(100 - blockerCount * 18 - warningCount * 7)
  const readiness = resolveReadiness(blockerCount, warningCount, readinessScore)

  return {
    title: draft.title,
    subtitle: `${selectedTrack.title} · ${selectedLesson.level} · ${draft.totalMinutes} min`,
    readiness,
    readinessScore,
    selectedTrack,
    selectedLesson,
    draft,
    blueprint: {
      objective: draft.objective,
      totalMinutes: draft.totalMinutes,
      stageCount: draft.stages.length,
      homeworkCount: draft.homeworkTasks.length
    },
    stageRows,
    qualityChecks,
    preview: createPreview(draft, qualityChecks),
    exports: createExports(catalog, selectedTrack, selectedLesson, draft, qualityChecks, readinessScore)
  }
}

const selectTrack = (catalog: AcademyCatalog, trackCode?: string) =>
  catalog.tracks.find(track => track.code === trackCode) ??
  catalog.tracks.find(track => track.code === catalog.default_track) ??
  catalog.tracks[0]
const selectLesson = (track: CatalogTrack, lessonCode?: string) =>
  track.lessons.find(lesson => lesson.code === lessonCode) ?? track.lessons[0]

const createDefaultDraft = (lesson: CatalogLesson): LessonAuthoringDraft => {
  const totalMinutes = parseMinutes(lesson.duration)
  const stageCount = Math.max(4, Math.ceil(totalMinutes / 20))

  return {
    title: lesson.title,
    objective: lesson.summary,
    totalMinutes,
    stages: Array.from({ length: stageCount }, (_, index) =>
      createDefaultStage(lesson, index, stageCount, totalMinutes)
    ),
    homeworkTasks: createHomeworkTasks(lesson)
  }
}

const createDefaultStage = (
  lesson: CatalogLesson,
  index: number,
  stageCount: number,
  totalMinutes: number
): LessonAuthoringStageDraft => {
  const command = lesson.mentor_commands[index % Math.max(lesson.mentor_commands.length, 1)] ??
    lesson.student_commands[index % Math.max(lesson.student_commands.length, 1)] ??
    lesson.launcher?.routes[0]?.check_command ??
    `review lesson ${lesson.code}`
  const readiness = lesson.readiness[index % Math.max(lesson.readiness.length, 1)]

  return {
    code: `${lesson.code}-stage-${index + 1}`,
    title: defaultStageTitle(index),
    durationMinutes: Math.max(1, Math.round(totalMinutes / stageCount)),
    mentorAction: `Показать и объяснить: ${lesson.summary}`,
    studentAction: lesson.student_commands[index % Math.max(lesson.student_commands.length, 1)] ??
      'Повторить действие и объяснить результат.',
    command,
    question: `Что должен доказать этап "${defaultStageTitle(index)}"?`,
    evidence: readiness
      ? `${readiness.label}: ${readiness.detail}`
      : `Ученик показал проверяемый результат по ${lesson.title}.`
  }
}

const defaultStageTitle = (index: number) =>
  ['Контекст и цель', 'Демо и диагностика', 'Практика ученика', 'Закрытие и homework'][index] ??
  `Практический этап ${index + 1}`

const createHomeworkTasks = (lesson: CatalogLesson) => {
  const homework = lesson.materials
    .filter(material => material.kind === 'homework')
    .map(material => `${material.label}: ${material.path}`)

  return homework.length > 0 ? homework : lesson.student_commands
}

const mergeDraft = (
  base: LessonAuthoringDraft,
  override: Partial<LessonAuthoringDraft>
): LessonAuthoringDraft => ({
  ...base,
  ...override,
  stages: override.stages ?? base.stages,
  homeworkTasks: override.homeworkTasks ?? base.homeworkTasks
})

const createQualityChecks = (
  lesson: CatalogLesson,
  draft: LessonAuthoringDraft
): AuthoringQualityCheck[] => [
  ...blocker(!draft.stages.length, 'no-stages', 'Нет stages', 'Добавь хотя бы один stage.'),
  ...blocker(sumDurations(draft.stages) === 0, 'zero-stage-duration', 'Сумма stage duration равна 0', 'Stage durations должны отражать реальный таймбокс.'),
  ...blocker(hasAnyMissing(draft.stages, 'mentorAction'), 'stage-mentor-action', 'Stage без mentor action', 'Каждый stage должен объяснять, что делает ментор.'),
  ...blocker(hasAnyMissing(draft.stages, 'studentAction'), 'stage-student-action', 'Stage без student action', 'Каждый stage должен иметь действие ученика.'),
  ...blocker(hasAnyMissing(draft.stages, 'evidence'), 'stage-evidence', 'Stage без evidence check', 'Каждый stage должен иметь проверяемый результат.'),
  ...blocker(!draft.homeworkTasks.length, 'empty-homework', 'Homework пустая', 'Добавь хотя бы одно задание или self-check.'),
  ...blocker(draft.totalMinutes < 30 || draft.totalMinutes > 90, 'total-minutes-range', 'Total minutes вне диапазона', 'Для v1 поддерживаем уроки 30-90 минут.'),
  ...warning(hasAnyMissing(draft.stages, 'command'), 'stage-command', 'Stage без runnable command', 'Команда помогает быстро показать практику.'),
  ...warning(hasAnyMissing(draft.stages, 'question'), 'stage-question', 'Stage без question', 'Вопросы включают ученика в занятие.'),
  ...warning(draft.stages.some(stage => stage.durationMinutes > 20), 'long-stage', 'Stage duration больше 20 минут', 'Длинные stage сложнее удерживать в темпе.'),
  ...warning(countFilled(draft.stages, 'evidence') < draft.stages.length, 'evidence-count', 'Evidence checks меньше количества stages', 'Каждый stage должен закрываться evidence.'),
  ...warning(!lesson.materials.length, 'student-prep', 'Нет student prep resource', 'Добавь workbook, deck или homework resource.'),
  ...warning(!lesson.next_lesson_code, 'next-lesson', 'Нет next lesson hint', 'Next lesson помогает закрыть learning path.')
]

const createPreview = (
  draft: LessonAuthoringDraft,
  checks: AuthoringQualityCheck[]
): AuthoringPreview => ({
  mentorRoute: draft.stages.map(stage => `${stage.title}: ${stage.mentorAction}`),
  studentRoute: [
    draft.objective,
    ...draft.stages.map(stage => `${stage.title}: ${stage.studentAction}`),
    ...draft.homeworkTasks.map(task => `Homework: ${task}`)
  ],
  missionControlImpact: checks
    .filter(check => check.severity !== 'ok')
    .map(check => `Закрыть: ${check.title}`)
})

const createExports = (
  catalog: AcademyCatalog,
  track: CatalogTrack,
  lesson: CatalogLesson,
  draft: LessonAuthoringDraft,
  checks: AuthoringQualityCheck[],
  readinessScore: number
): AuthoringExports => ({
  catalogPatchMarkdown: [
    `# Lesson Authoring: ${draft.title}`,
    '',
    `Track: ${track.title}`,
    `Lesson: ${lesson.code}`,
    `Readiness score: ${readinessScore}%`,
    '',
    '## Stage Matrix',
    ...draft.stages.map(stage => `- ${stage.title} (${stage.durationMinutes} min): ${stage.evidence}`),
    '',
    '## Homework',
    ...listOrFallback(draft.homeworkTasks)
  ].join('\n'),
  lessonPackageJson: JSON.stringify({
    contract_version: catalog.contract_version,
    generated_from: 'Lesson Authoring Studio',
    track_code: track.code,
    lesson_code: lesson.code,
    draft,
    quality_checks: checks
  }, null, 2),
  sessionSeedJson: JSON.stringify({
    contract_version: 'academy-session/v1',
    academy_version: catalog.contract_version,
    lab_name: lesson.launcher?.lab ?? lesson.code,
    student_name: 'Demo Student',
    created_at: catalog.generated_at,
    current_stage: draft.stages[0],
    stages: draft.stages,
    skill_graph: [],
    commands: draft.stages.map(stage => stage.command).filter(Boolean),
    events: []
  }, null, 2),
  qualityReportMarkdown: [
    `# Quality Gate: ${draft.title}`,
    '',
    '## Blockers',
    ...listChecks(checks, 'blocker'),
    '',
    '## Warnings',
    ...listChecks(checks, 'warning')
  ].join('\n')
})

const optionalText = (key: keyof LessonAuthoringDraft, value: unknown) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized ? { [key]: normalized } : {}
}
const optionalPositiveNumber = (key: keyof LessonAuthoringDraft, value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? { [key]: value } : {}

const optionalTextList = (key: keyof LessonAuthoringDraft, value: unknown) => {
  if (!Array.isArray(value)) {
    return {}
  }

  const normalized = value
    .map(item => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean)

  return normalized.length ? { [key]: normalized } : {}
}

const optionalStages = (value: unknown) => {
  if (!Array.isArray(value)) {
    return {}
  }

  const stages = value.map(normalizeStage).filter(Boolean) as LessonAuthoringStageDraft[]
  return stages.length ? { stages } : {}
}

const normalizeStage = (value: unknown): LessonAuthoringStageDraft | null => {
  if (!value || typeof value !== 'object') {
    return null
  }
  const stage = value as Partial<LessonAuthoringStageDraft>
  const code = normalizeText(stage.code)
  const title = normalizeText(stage.title)
  const durationMinutes = typeof stage.durationMinutes === 'number' &&
    Number.isFinite(stage.durationMinutes) && stage.durationMinutes >= 0
    ? stage.durationMinutes
    : 0

  return code && title
    ? {
        code,
        title,
        durationMinutes,
        mentorAction: normalizeText(stage.mentorAction),
        studentAction: normalizeText(stage.studentAction),
        command: normalizeText(stage.command),
        question: normalizeText(stage.question),
        evidence: normalizeText(stage.evidence)
      }
    : null
}

const normalizeText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''
const parseMinutes = (duration: string) => {
  const parsed = Number(duration.match(/\d+/)?.[0] ?? 60)
  return Number.isFinite(parsed) ? parsed : 60
}

const hasAnyMissing = (
  stages: LessonAuthoringStageDraft[],
  field: keyof LessonAuthoringStageDraft
) => stages.some(stage => !String(stage[field]).trim())
const countFilled = (
  stages: LessonAuthoringStageDraft[],
  field: keyof LessonAuthoringStageDraft
) => stages.filter(stage => String(stage[field]).trim()).length
const sumDurations = (stages: LessonAuthoringStageDraft[]) =>
  stages.reduce((sum, stage) => sum + stage.durationMinutes, 0)
const blocker = (condition: boolean, code: string, title: string, detail: string) =>
  condition ? [{ code, title, detail, severity: 'blocker' as const }] : []
const warning = (condition: boolean, code: string, title: string, detail: string) =>
  condition ? [{ code, title, detail, severity: 'warning' as const }] : []
const countBySeverity = (checks: AuthoringQualityCheck[], severity: AuthoringSeverity) =>
  checks.filter(check => check.severity === severity).length
const clampScore = (score: number) =>
  Math.max(0, Math.min(100, score))

const resolveReadiness = (
  blockerCount: number,
  warningCount: number,
  readinessScore: number
): AuthoringReadiness => {
  if (blockerCount > 0) {
    return 'blocked'
  }
  return warningCount > 0 || readinessScore < 85 ? 'needs-work' : 'ready'
}

const listOrFallback = (items: string[]) =>
  items.length ? items.map(item => `- ${item}`) : ['- Нет данных']

const listChecks = (checks: AuthoringQualityCheck[], severity: AuthoringSeverity) => {
  const filtered = checks.filter(check => check.severity === severity)
  return filtered.length
    ? filtered.map(check => `- ${check.title}: ${check.detail}`)
    : ['- Нет']
}
