import type {
  AcademySession,
  AcademyStage,
  SkillNode
} from '../../core/session/domain/academy-session.ts'
import {
  buildEvidenceLedgerState,
  normalizeEvidenceLedgerLocalState,
  type EvidenceLedgerInput,
  type EvidenceLedgerRow
} from '../evidence-ledger/evidence-ledger-state.ts'
import {
  normalizeReviewLocalState,
  type ReviewLocalState
} from '../review-center/review-center-state.ts'
import {
  buildSubmissionInboxState,
  normalizeSubmissionLocalState,
  type SubmissionEvidenceEntry,
  type SubmissionLocalState
} from '../submission-inbox/submission-inbox-state.ts'
import {
  ASSESSMENT_LEVEL_SCORE as LEVEL_SCORE,
  type AssessmentSkillLevel
} from './assessment-levels.ts'

export type { AssessmentSkillLevel } from './assessment-levels.ts'
export type AssessmentEvidenceSource = 'mentor' | 'ledger' | 'homework'
export type AssessmentPathStatus = 'open' | 'ready' | 'next'

export interface AssessmentCenterInput extends Partial<ReviewLocalState>, EvidenceLedgerInput {
  submissionState?: Partial<SubmissionLocalState> | null
}

export interface AssessmentMetrics {
  skillCount: number
  masteryPercent: number
  readySkillCount: number
  blockedSkillCount: number
  nextLessonFocusCount: number
}

export interface AssessmentSkill {
  code: string
  title: string
  level: AssessmentSkillLevel
  score: number
  expectedEvidence: string
  evidenceSources: AssessmentEvidenceSource[]
  evidenceDetails: string[]
  stageTitle: string
  ledgerStatus: string
  blocker: string
  nextAction: string
}

export interface AssessmentLearningPathItem {
  code: string
  title: string
  description: string
  status: AssessmentPathStatus
}

export interface AssessmentCenterState {
  title: string
  studentName: string
  labName: string
  createdAt: string
  metrics: AssessmentMetrics
  skills: AssessmentSkill[]
  focusSkills: AssessmentSkill[]
  learningPath: AssessmentLearningPathItem[]
  recommendations: string[]
  reportMarkdown: string
}

export interface AssessmentExport {
  student_name: string
  lab_name: string
  created_at: string
  mastery_percent: number
  metrics: AssessmentMetrics
  skills: AssessmentSkill[]
  focus_skills: AssessmentSkill[]
  learning_path: AssessmentLearningPathItem[]
  recommendations: string[]
  report_markdown: string
}

export const buildAssessmentCenterState = (
  session: AcademySession,
  input: AssessmentCenterInput = {}
): AssessmentCenterState => {
  const reviewInput = normalizeReviewLocalState(input)
  const ledgerInput = normalizeEvidenceLedgerLocalState(input)
  const ledger = buildEvidenceLedgerState(session, {
    ...ledgerInput,
    checkedEvidence: reviewInput.checkedEvidence,
    notesByStage: reviewInput.notesByStage
  })
  const submission = buildSubmissionInboxState(
    session,
    normalizeSubmissionLocalState(input.submissionState)
  )
  const submissionEvidence = createSubmissionEvidenceMap(submission)
  const checkedEvidence = new Set(reviewInput.checkedEvidence)
  const skills = session.skill_graph.map(skill =>
    assessSkill(skill, session, reviewInput, checkedEvidence, ledger.rows, submissionEvidence)
  )
  const metrics = createMetrics(skills)
  const focusSkills = skills.filter(isFocusSkill)
  const state = {
    title: `${session.student_name} · ${session.lab_name}`,
    studentName: session.student_name,
    labName: session.lab_name,
    createdAt: session.created_at,
    metrics,
    skills,
    focusSkills,
    learningPath: createLearningPath(
      session,
      metrics,
      submission.latestSubmission?.score.percent ?? submission.draftScore.percent
    ),
    recommendations: createRecommendations(focusSkills, session),
    reportMarkdown: ''
  }

  return {
    ...state,
    reportMarkdown: createAssessmentReportMarkdown(state)
  }
}

export const createAssessmentExport = (
  state: AssessmentCenterState
): AssessmentExport => ({
  student_name: state.studentName,
  lab_name: state.labName,
  created_at: state.createdAt,
  mastery_percent: state.metrics.masteryPercent,
  metrics: state.metrics,
  skills: state.skills,
  focus_skills: state.focusSkills,
  learning_path: state.learningPath,
  recommendations: state.recommendations,
  report_markdown: createAssessmentReportMarkdown(state)
})

export const createAssessmentReportMarkdown = (
  state: Pick<
    AssessmentCenterState,
    'title' | 'metrics' | 'skills' | 'focusSkills' | 'learningPath' | 'recommendations'
  >
) => [
  `# Skill Assessment: ${state.title}`,
  '',
  `Mastery: ${state.metrics.masteryPercent}%`,
  `Ready skills: ${state.metrics.readySkillCount}/${state.metrics.skillCount}`,
  `Focus skills: ${state.metrics.nextLessonFocusCount}`,
  '',
  '## Skills',
  ...state.skills.flatMap(formatSkill),
  '',
  '## Focus',
  ...listOrFallback(
    state.focusSkills.map(skill => `${skill.title}: ${skill.nextAction}`),
    'Все skills готовы к следующему уроку.'
  ),
  '',
  '## Learning Path',
  ...state.learningPath.map(item => `- ${item.title}: ${item.description}`),
  ...formatNextLesson(state.learningPath),
  '',
  '## Recommendations',
  ...listOrFallback(state.recommendations, 'Рекомендаций нет.'),
  ''
].join('\n')

const assessSkill = (
  skill: SkillNode,
  session: AcademySession,
  reviewInput: ReviewLocalState,
  checkedEvidence: Set<string>,
  ledgerRows: EvidenceLedgerRow[],
  submissionEvidence: Map<string, SubmissionEvidenceEntry>
): AssessmentSkill => {
  const stage = findStageForSkill(skill, session.stages)
  const ledgerRow = stage ? ledgerRows.find(row => row.code === stage.code) : undefined
  const stageNote = stage ? reviewInput.notesByStage[stage.code] ?? '' : ''
  const homeworkEvidence = submissionEvidence.get(`skill:${skill.code}`)
  const signals = {
    mentor: isSkillChecked(skill, checkedEvidence),
    ledger: hasLedgerSignal(ledgerRow),
    homework: Boolean(homeworkEvidence?.isComplete),
    note: Boolean(stageNote.trim())
  }
  const level = resolveSkillLevel(signals, ledgerRow)

  return {
    code: skill.code,
    title: skill.title,
    level,
    score: LEVEL_SCORE[level],
    expectedEvidence: skill.evidence,
    evidenceSources: createEvidenceSources(signals),
    evidenceDetails: createEvidenceDetails(skill, stageNote, ledgerRow, homeworkEvidence),
    stageTitle: stage?.title ?? 'Stage не найден',
    ledgerStatus: ledgerRow?.status ?? 'pending',
    blocker: ledgerRow?.blocker ?? '',
    nextAction: createNextAction(skill, level, ledgerRow?.blocker ?? '')
  }
}

const resolveSkillLevel = (
  signals: { mentor: boolean; ledger: boolean; homework: boolean; note: boolean },
  ledgerRow?: EvidenceLedgerRow
): AssessmentSkillLevel => {
  if (signals.mentor && signals.homework && ledgerRow?.status === 'done') {
    return 'can-apply'
  }
  if (signals.mentor && (signals.note || ledgerRow?.status === 'done')) {
    return 'can-explain'
  }
  if (signals.mentor || signals.homework) {
    return 'can-repeat'
  }
  if (signals.note || signals.ledger) {
    return 'aware'
  }

  return 'not-started'
}

const createMetrics = (skills: AssessmentSkill[]): AssessmentMetrics => {
  const maxScore = skills.length * LEVEL_SCORE['can-apply']
  const actualScore = skills.reduce((sum, skill) => sum + skill.score, 0)

  return {
    skillCount: skills.length,
    masteryPercent: maxScore === 0 ? 0 : Math.round((actualScore / maxScore) * 100),
    readySkillCount: skills.filter(skill => skill.score >= LEVEL_SCORE['can-explain']).length,
    blockedSkillCount: skills.filter(skill => skill.blocker.trim() || skill.score <= LEVEL_SCORE.aware).length,
    nextLessonFocusCount: skills.filter(isFocusSkill).length
  }
}

const createLearningPath = (
  session: AcademySession,
  metrics: AssessmentMetrics,
  homeworkPercent: number
): AssessmentLearningPathItem[] => {
  const basePath = [
    {
      code: 'lesson-evidence',
      title: 'Lesson evidence closure',
      description: `${metrics.readySkillCount}/${metrics.skillCount} skills на уровне can-explain или выше.`,
      status: metrics.nextLessonFocusCount === 0 ? 'ready' as const : 'open' as const
    },
    {
      code: 'homework',
      title: 'Homework closure',
      description: `Homework evidence закрыт на ${homeworkPercent}%.`,
      status: homeworkPercent === 100 ? 'ready' as const : 'open' as const
    }
  ]
  const nextLesson = session.control_plane?.next_lesson

  return nextLesson
    ? [
        ...basePath,
        {
          code: nextLesson.code,
          title: `${formatLessonLabel(nextLesson.code)}: ${nextLesson.title}`,
          description: `Следующий маршрут: ${nextLesson.path}`,
          status: 'next' as const
        }
      ]
    : basePath
}

const createRecommendations = (
  focusSkills: AssessmentSkill[],
  session: AcademySession
) => {
  if (focusSkills.length === 0) {
    return [
      `Перейти к next lesson: ${session.control_plane?.next_lesson?.title ?? 'not planned'}.`
    ]
  }

  return uniqueStrings([
    `Начать с evidence по ${focusSkills[0].title}: ${focusSkills[0].expectedEvidence}`,
    ...focusSkills.map(skill => skill.nextAction),
    ...focusSkills
      .filter(skill => skill.blocker.trim())
      .map(skill => `Разобрать blocker по ${skill.title}: ${skill.blocker}`)
  ])
}

const createEvidenceSources = (
  signals: { mentor: boolean; ledger: boolean; homework: boolean }
): AssessmentEvidenceSource[] => [
  signals.mentor ? 'mentor' as const : null,
  signals.ledger ? 'ledger' as const : null,
  signals.homework ? 'homework' as const : null
].filter((item): item is AssessmentEvidenceSource => Boolean(item))

const createEvidenceDetails = (
  skill: SkillNode,
  stageNote: string,
  ledgerRow?: EvidenceLedgerRow,
  homeworkEvidence?: SubmissionEvidenceEntry
) => [
  `Expected: ${skill.evidence}`,
  stageNote.trim() ? `Mentor note: ${stageNote.trim()}` : '',
  ledgerRow ? `Ledger: ${ledgerRow.status}, actual ${ledgerRow.actualMinutes} min` : '',
  homeworkEvidence?.isComplete ? `Homework: ${homeworkEvidence.value}` : ''
].filter(item => item.trim())

const createNextAction = (
  skill: SkillNode,
  level: AssessmentSkillLevel,
  blocker: string
) => {
  if (blocker.trim()) {
    return `Разобрать blocker и дать короткий mini-lab: ${skill.title}.`
  }
  if (level === 'not-started') {
    return `Закрыть evidence: ${skill.evidence}`
  }
  if (level === 'aware') {
    return `Попросить ученика повторить ход решения по ${skill.title}.`
  }
  if (level === 'can-repeat') {
    return `Попросить объяснить trade-offs и добавить короткий mini-lab: ${skill.title}.`
  }
  if (level === 'can-explain') {
    return `Дать прикладной mini-lab и проверить перенос навыка без подсказок.`
  }
  return `Зафиксировать как сильный skill и использовать как опору в next lesson.`
}

const createSubmissionEvidenceMap = (
  submission: ReturnType<typeof buildSubmissionInboxState>
) => new Map(
  (submission.latestSubmission?.evidence ?? submission.checklist.map(item => ({
    id: item.id,
    title: item.title,
    prompt: item.prompt,
    value: submission.draft.evidenceByItem[item.id] ?? '',
    isComplete: isCompleteText(submission.draft.evidenceByItem[item.id])
  }))).map(item => [item.id, item])
)

const findStageForSkill = (skill: SkillNode, stages: AcademyStage[]) =>
  stages.find(stage => stage.code === skill.code) ??
  stages.find(stage => stage.title.includes(skill.title))

const isSkillChecked = (skill: SkillNode, checkedEvidence: Set<string>) =>
  checkedEvidence.has(skill.code) || checkedEvidence.has(skill.title)

const hasLedgerSignal = (row?: EvidenceLedgerRow) =>
  Boolean(row && (row.status !== 'pending' || row.blocker.trim() || row.note.trim()))

const isFocusSkill = (skill: AssessmentSkill) =>
  Boolean(skill.blocker.trim()) || skill.score < LEVEL_SCORE['can-explain']

const formatSkill = (skill: AssessmentSkill) => [
  `- ${skill.title}: ${skill.level}`,
  `  - Stage: ${skill.stageTitle}`,
  `  - Sources: ${skill.evidenceSources.length > 0 ? skill.evidenceSources.join(', ') : 'none'}`,
  `  - Next action: ${skill.nextAction}`,
  ...(skill.blocker.trim() ? [`  - Blocker: ${skill.blocker}`] : [])
]

const listOrFallback = (items: string[], fallback: string) =>
  items.length > 0 ? items.map(item => `- ${item}`) : [`- ${fallback}`]

const formatNextLesson = (items: AssessmentLearningPathItem[]) => {
  const nextLesson = items.find(item => item.status === 'next')

  return nextLesson ? [`Next lesson: ${nextLesson.title.replace(/^Lesson \d{2}: /, '')}`] : []
}

const formatLessonLabel = (code: string) => {
  const match = code.match(/\d{2}/)
  return match ? `Lesson ${match[0]}` : 'Next lesson'
}

const isCompleteText = (value: unknown) =>
  typeof value === 'string' && value.trim().length >= 8

const uniqueStrings = (items: string[]) => [...new Set(items.filter(item => item.trim()))]
