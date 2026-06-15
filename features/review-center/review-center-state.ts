import type {
  AcademySession,
  AcademyStage,
  SkillNode
} from '../../core/session/domain/academy-session.ts'
import {
  buildEvidenceLedgerState,
  normalizeEvidenceLedgerLocalState,
  type EvidenceLedgerRow,
  type EvidenceLedgerStageStatus,
  type EvidenceLedgerSummary
} from '../evidence-ledger/evidence-ledger-state.ts'

export type ReviewStageStatus = 'reviewed' | 'needs-review'

export interface ReviewLocalState {
  checkedEvidence: string[]
  notesByStage: Record<string, string>
  flagsByStage: Record<string, string[]>
  stageStatuses: Record<string, EvidenceLedgerStageStatus>
  actualMinutesByStage: Record<string, number>
  blockersByStage: Record<string, string>
}

export interface ReviewEvidenceScore {
  checked: number
  total: number
  percent: number
}

export interface ReviewStageSummary {
  code: string
  title: string
  timebox: string
  note: string
  question?: string
  expectedAnswer?: string
  verification?: string
  reviewStatus: ReviewStageStatus
  ledgerStatus: EvidenceLedgerStageStatus
  plannedMinutes: number
  actualMinutes: number
  timeDeltaMinutes: number
  evidenceChecked: number
  evidenceTotal: number
  blocker: string
}

export interface ReviewNextLesson {
  code: string
  title: string
  path: string
}

export interface ReviewCenterState {
  title: string
  studentName: string
  labName: string
  createdAt: string
  evidenceScore: ReviewEvidenceScore
  stageSummaries: ReviewStageSummary[]
  strengths: string[]
  risks: string[]
  recommendations: string[]
  ledgerSummary: EvidenceLedgerSummary
  nextLesson?: ReviewNextLesson
}

export interface ReviewExportPayload {
  student_name: string
  lab_name: string
  created_at: string
  evidence_score: ReviewEvidenceScore
  stage_summaries: ReviewStageSummary[]
  strengths: string[]
  risks: string[]
  recommendations: string[]
  ledger_summary: EvidenceLedgerSummary
  next_lesson?: ReviewNextLesson
  report_markdown: string
}

export const buildReviewCenterState = (
  session: AcademySession,
  localState: Partial<ReviewLocalState> = {}
): ReviewCenterState => {
  const normalized = normalizeReviewLocalState(localState)
  const checkedSkillSet = new Set(normalized.checkedEvidence)
  const checkedSkills = session.skill_graph.filter(skill => isSkillChecked(skill, checkedSkillSet))
  const missingSkills = session.skill_graph.filter(skill => !isSkillChecked(skill, checkedSkillSet))
  const ledger = buildEvidenceLedgerState(session, normalized)
  const ledgerRowsByCode = new Map(ledger.rows.map(row => [row.code, row]))

  return {
    title: `${session.student_name} · ${session.lab_name}`,
    studentName: session.student_name,
    labName: session.lab_name,
    createdAt: session.created_at,
    evidenceScore: createEvidenceScore(checkedSkills.length, session.skill_graph.length),
    stageSummaries: session.stages.map(stage =>
      summarizeStage(stage, session, normalized, checkedSkillSet, ledgerRowsByCode.get(stage.code))
    ),
    strengths: strengthsFromSkills(checkedSkills),
    risks: [
      ...risksFromSkills(missingSkills),
      ...risksFromLedger(ledger.rows, ledger.summary)
    ],
    recommendations: recommendationsFor(session, missingSkills),
    ledgerSummary: ledger.summary,
    nextLesson: session.control_plane?.next_lesson
  }
}

export const createReviewReportMarkdown = (state: ReviewCenterState) => {
  const lines = [
    `# Lesson Review: ${state.title}`,
    '',
    `Evidence score: ${state.evidenceScore.checked}/${state.evidenceScore.total} (${state.evidenceScore.percent}%)`,
    '',
    '## Strengths',
    ...listOrFallback(state.strengths, 'No confirmed evidence yet.'),
    '',
    '## Risks',
    ...listOrFallback(state.risks, 'No open risks.'),
    '',
    '## Ledger Signals',
    `Ledger: ${state.ledgerSummary.done}/${state.ledgerSummary.total} done · ${state.ledgerSummary.risk} risk · ${formatDelta(state.ledgerSummary.deltaMinutes)} min`,
    ...state.stageSummaries.flatMap(formatLedgerStageSummary),
    '',
    '## Stage Notes',
    ...state.stageSummaries.map(stage =>
      `- ${stage.timebox} ${stage.title}: ${stage.note || 'no mentor note'}`
    ),
    '',
    '## Recommendations',
    ...listOrFallback(state.recommendations, 'No recommendations.'),
    ''
  ]

  if (state.nextLesson) {
    lines.push(
      `Next lesson: ${state.nextLesson.title}`,
      `Next lesson path: ${state.nextLesson.path}`,
      ''
    )
  }

  return lines.join('\n')
}

export const createReviewExportPayload = (
  state: ReviewCenterState
): ReviewExportPayload => ({
  student_name: state.studentName,
  lab_name: state.labName,
  created_at: state.createdAt,
  evidence_score: state.evidenceScore,
  stage_summaries: state.stageSummaries,
  strengths: state.strengths,
  risks: state.risks,
  recommendations: state.recommendations,
  ledger_summary: state.ledgerSummary,
  next_lesson: state.nextLesson,
  report_markdown: createReviewReportMarkdown(state)
})

export const normalizeReviewLocalState = (
  value?: Partial<ReviewLocalState> | null
): ReviewLocalState => ({
  checkedEvidence: Array.isArray(value?.checkedEvidence)
    ? value.checkedEvidence.filter(isNonEmptyString)
    : [],
  notesByStage: isStringRecord(value?.notesByStage) ? value.notesByStage : {},
  flagsByStage: isStringArrayRecord(value?.flagsByStage) ? value.flagsByStage : {},
  ...normalizeEvidenceLedgerLocalState(value)
})

const createEvidenceScore = (checked: number, total: number): ReviewEvidenceScore => ({
  checked,
  total,
  percent: total === 0 ? 0 : Math.round((checked / total) * 100)
})

const summarizeStage = (
  stage: AcademyStage,
  session: AcademySession,
  localState: ReviewLocalState,
  checkedSkillSet: Set<string>,
  ledgerRow?: EvidenceLedgerRow
): ReviewStageSummary => {
  const linkedSkills = skillsForStage(stage, session.skill_graph)
  const hasCheckedSkill = linkedSkills.some(skill => isSkillChecked(skill, checkedSkillSet))
  const note = localState.notesByStage[stage.code] ?? ''
  const guide = session.control_plane?.mentor_mode.stage_guides.find(
    candidate => candidate.stage_code === stage.code
  )

  return {
    code: stage.code,
    title: stage.title,
    timebox: stage.timebox,
    note,
    question: guide?.question,
    expectedAnswer: guide?.expected_answer,
    verification: guide?.verification,
    reviewStatus: note.trim() || hasCheckedSkill || ledgerRow?.status === 'done'
      ? 'reviewed'
      : 'needs-review',
    ledgerStatus: ledgerRow?.status ?? 'pending',
    plannedMinutes: ledgerRow?.plannedMinutes ?? 0,
    actualMinutes: ledgerRow?.actualMinutes ?? 0,
    timeDeltaMinutes: ledgerRow ? ledgerRow.actualMinutes - ledgerRow.plannedMinutes : 0,
    evidenceChecked: ledgerRow?.evidenceChecked ?? 0,
    evidenceTotal: ledgerRow?.evidenceTotal ?? 0,
    blocker: ledgerRow?.blocker ?? ''
  }
}

const strengthsFromSkills = (skills: SkillNode[]) =>
  skills.map(skill => `Confirmed evidence: ${skill.title} — ${skill.evidence}`)

const risksFromSkills = (skills: SkillNode[]) =>
  skills.map(skill => `Evidence gap: ${skill.title} — ${skill.evidence}`)

const risksFromLedger = (
  rows: EvidenceLedgerRow[],
  summary: EvidenceLedgerSummary
) => [
  ...rows
    .filter(row => row.status === 'risk' || row.status === 'skipped')
    .map(row => `Ledger risk: ${row.title}${row.blocker ? ` — ${row.blocker}` : ''}`),
  ...(summary.deltaMinutes > 0
    ? [`Ledger time overrun: ${formatDelta(summary.deltaMinutes)} min`]
    : [])
]

const recommendationsFor = (session: AcademySession, missingSkills: SkillNode[]) => {
  const recommendations = missingSkills.map(
    skill => `Закрыть evidence: ${skill.title}. ${skill.evidence}`
  )
  const missingSkillCodes = new Set(missingSkills.map(skill => skill.code))
  const commands = session.stages
    .filter(stage => missingSkillCodes.has(stage.code))
    .map(stage => stage.command)
    .filter(command => command.trim())

  return [...recommendations, ...commands.map(command => `Показать команду: ${command}`)]
}

const skillsForStage = (stage: AcademyStage, skills: SkillNode[]) =>
  skills.filter(skill => skill.code === stage.code || stage.title.includes(skill.title))

const isSkillChecked = (skill: SkillNode, checked: Set<string>) =>
  checked.has(skill.title) || checked.has(skill.code)

const listOrFallback = (items: string[], fallback: string) =>
  items.length > 0 ? items.map(item => `- ${item}`) : [`- ${fallback}`]

const formatLedgerStageSummary = (stage: ReviewStageSummary) => {
  const lines = [
    `- ${stage.timebox} ${stage.title}: ${stage.ledgerStatus}, planned ${stage.plannedMinutes} min, actual ${stage.actualMinutes} min, delta ${formatDelta(stage.timeDeltaMinutes)} min, evidence ${stage.evidenceChecked}/${stage.evidenceTotal}`
  ]

  if (stage.blocker.trim()) {
    lines.push(`  - blocker: ${stage.blocker}`)
  }

  return lines
}

const formatDelta = (minutes: number) => (minutes > 0 ? `+${minutes}` : String(minutes))

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every(item => typeof item === 'string')

const isStringArrayRecord = (value: unknown): value is Record<string, string[]> =>
  isRecord(value) &&
  Object.values(value).every(
    item => Array.isArray(item) && item.every(entry => typeof entry === 'string')
  )

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
