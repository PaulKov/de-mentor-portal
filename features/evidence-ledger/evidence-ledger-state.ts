import type {
  AcademySession,
  AcademyStage,
  SkillNode
} from '../../core/session/domain/academy-session.ts'

export type EvidenceLedgerStageStatus = 'pending' | 'done' | 'skipped' | 'risk'

export interface EvidenceLedgerLocalState {
  stageStatuses: Record<string, EvidenceLedgerStageStatus>
  actualMinutesByStage: Record<string, number>
  blockersByStage: Record<string, string>
}

export interface EvidenceLedgerInput extends Partial<EvidenceLedgerLocalState> {
  checkedEvidence?: string[]
  notesByStage?: Record<string, string>
}

export interface EvidenceLedgerRow {
  code: string
  title: string
  timebox: string
  status: EvidenceLedgerStageStatus
  plannedMinutes: number
  actualMinutes: number
  evidenceChecked: number
  evidenceTotal: number
  note: string
  blocker: string
  question?: string
  verification?: string
}

export interface EvidenceLedgerSummary {
  total: number
  pending: number
  done: number
  skipped: number
  risk: number
  plannedMinutes: number
  actualMinutes: number
  deltaMinutes: number
  evidenceChecked: number
  evidenceTotal: number
  evidencePercent: number
}

export interface EvidenceLedgerState {
  title: string
  rows: EvidenceLedgerRow[]
  summary: EvidenceLedgerSummary
  handoffMarkdown: string
}

export const createEvidenceLedgerStorageKey = (session: AcademySession) =>
  [
    'evidence-ledger',
    session.contract_version,
    session.lab_name,
    session.student_name,
    session.created_at
  ].join(':')

export const buildEvidenceLedgerState = (
  session: AcademySession,
  input: EvidenceLedgerInput = {}
): EvidenceLedgerState => {
  const localState = normalizeEvidenceLedgerLocalState(input)
  const checkedEvidence = new Set(input.checkedEvidence ?? [])
  const notesByStage = input.notesByStage ?? {}
  const rows = session.stages.map(stage =>
    buildRow(stage, session, localState, checkedEvidence, notesByStage)
  )
  const summary = buildSummary(rows)

  return {
    title: `${session.student_name} · ${session.lab_name}`,
    rows,
    summary,
    handoffMarkdown: createEvidenceLedgerMarkdown(session, rows, summary)
  }
}

export const normalizeEvidenceLedgerLocalState = (
  value?: EvidenceLedgerInput | null
): EvidenceLedgerLocalState => ({
  stageStatuses: normalizeStatuses(value?.stageStatuses),
  actualMinutesByStage: normalizeActualMinutes(value?.actualMinutesByStage),
  blockersByStage: normalizeBlockers(value?.blockersByStage)
})

export const createEvidenceLedgerMarkdown = (
  session: AcademySession,
  rows: EvidenceLedgerRow[],
  summary: EvidenceLedgerSummary
) => {
  const lines = [
    `# Lesson Run Ledger: ${session.student_name} · ${session.lab_name}`,
    '',
    `Status: ${summary.done}/${summary.total} done, ${summary.risk} risk, ${summary.skipped} skipped`,
    `Evidence: ${summary.evidenceChecked}/${summary.evidenceTotal} (${summary.evidencePercent}%)`,
    `Time: planned ${summary.plannedMinutes} min, actual ${summary.actualMinutes} min, delta ${formatDelta(summary.deltaMinutes)} min`,
    '',
    '## Stage Ledger',
    ...rows.flatMap(row => formatRow(row)),
    ''
  ]

  return lines.join('\n')
}

export const parseStageTimeboxMinutes = (timebox: string) => {
  const match = timebox.match(/^(\d{1,3}):(\d{2})-(\d{1,3}):(\d{2})$/)
  if (!match) {
    return 0
  }

  const start = Number(match[1]) * 60 + Number(match[2])
  const end = Number(match[3]) * 60 + Number(match[4])

  return Math.max(0, Math.round((end - start) / 60))
}

const buildRow = (
  stage: AcademyStage,
  session: AcademySession,
  localState: EvidenceLedgerLocalState,
  checkedEvidence: Set<string>,
  notesByStage: Record<string, string>
): EvidenceLedgerRow => {
  const linkedSkills = skillsForStage(stage, session.skill_graph)
  const plannedMinutes = parseStageTimeboxMinutes(stage.timebox)
  const guide = session.control_plane?.mentor_mode.stage_guides.find(
    candidate => candidate.stage_code === stage.code
  )

  return {
    code: stage.code,
    title: stage.title,
    timebox: stage.timebox,
    status: localState.stageStatuses[stage.code] ?? 'pending',
    plannedMinutes,
    actualMinutes: localState.actualMinutesByStage[stage.code] ?? plannedMinutes,
    evidenceChecked: linkedSkills.filter(skill => isSkillChecked(skill, checkedEvidence)).length,
    evidenceTotal: linkedSkills.length,
    note: notesByStage[stage.code] ?? '',
    blocker: localState.blockersByStage[stage.code] ?? '',
    question: guide?.question,
    verification: guide?.verification
  }
}

const buildSummary = (rows: EvidenceLedgerRow[]): EvidenceLedgerSummary => {
  const evidenceTotal = rows.reduce((sum, row) => sum + row.evidenceTotal, 0)
  const evidenceChecked = rows.reduce((sum, row) => sum + row.evidenceChecked, 0)
  const plannedMinutes = rows.reduce((sum, row) => sum + row.plannedMinutes, 0)
  const actualMinutes = rows.reduce((sum, row) => sum + row.actualMinutes, 0)

  return {
    total: rows.length,
    pending: countStatus(rows, 'pending'),
    done: countStatus(rows, 'done'),
    skipped: countStatus(rows, 'skipped'),
    risk: countStatus(rows, 'risk'),
    plannedMinutes,
    actualMinutes,
    deltaMinutes: actualMinutes - plannedMinutes,
    evidenceChecked,
    evidenceTotal,
    evidencePercent: evidenceTotal === 0 ? 0 : Math.round((evidenceChecked / evidenceTotal) * 100)
  }
}

const formatRow = (row: EvidenceLedgerRow) => {
  const lines = [
    `- ${row.timebox} ${row.title}: ${row.status}, planned ${row.plannedMinutes} min, actual ${row.actualMinutes} min, evidence ${row.evidenceChecked}/${row.evidenceTotal}`
  ]

  if (row.note.trim()) {
    lines.push(`  - note: ${row.note}`)
  }
  if (row.blocker.trim()) {
    lines.push(`  - blocker: ${row.blocker}`)
  }

  return lines
}

const normalizeStatuses = (value?: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(isRecord(value) ? value : {})
      .filter((entry): entry is [string, EvidenceLedgerStageStatus] => isKnownStatus(entry[1]))
  )

const normalizeActualMinutes = (value?: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(isRecord(value) ? value : {})
      .filter(([, minutes]) => Number.isFinite(Number(minutes)))
      .map(([stageCode, minutes]) => [
        stageCode,
        Math.min(240, Math.max(0, Math.round(Number(minutes))))
      ])
  )

const normalizeBlockers = (value?: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(isRecord(value) ? value : {})
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  )

const skillsForStage = (stage: AcademyStage, skills: SkillNode[]) =>
  skills.filter(skill => skill.code === stage.code || stage.title.includes(skill.title))

const isSkillChecked = (skill: SkillNode, checkedEvidence: Set<string>) =>
  checkedEvidence.has(skill.title) || checkedEvidence.has(skill.code)

const countStatus = (rows: EvidenceLedgerRow[], status: EvidenceLedgerStageStatus) =>
  rows.filter(row => row.status === status).length

const formatDelta = (minutes: number) => (minutes > 0 ? `+${minutes}` : String(minutes))

const isKnownStatus = (value: unknown): value is EvidenceLedgerStageStatus =>
  value === 'pending' || value === 'done' || value === 'skipped' || value === 'risk'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
