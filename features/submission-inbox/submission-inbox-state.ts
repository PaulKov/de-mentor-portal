import type {
  AcademySession,
  SkillNode
} from '../../core/session/domain/academy-session.ts'
import type { NextLesson } from '../../core/session/domain/control-plane.ts'

export type SubmissionStatus = 'needs-evidence' | 'ready-for-review'

export interface SubmissionChecklistItem {
  id: string
  title: string
  prompt: string
  reference: string
  acceptedSignals: string[]
}

export interface SubmissionDraft {
  evidenceByItem: Record<string, string>
}

export interface SubmissionScore {
  completed: number
  total: number
  percent: number
}

export interface SubmissionEvidenceEntry {
  id: string
  title: string
  prompt: string
  value: string
  isComplete: boolean
}

export interface SubmissionRecord {
  id: string
  sessionKey: string
  studentName: string
  labName: string
  createdAt: string
  status: SubmissionStatus
  score: SubmissionScore
  evidence: SubmissionEvidenceEntry[]
  nextLesson?: NextLesson
}

export interface SubmissionLocalState {
  draft: SubmissionDraft
  submissions: SubmissionRecord[]
}

export interface SubmissionInboxState {
  title: string
  sessionKey: string
  checklist: SubmissionChecklistItem[]
  draft: SubmissionDraft
  draftScore: SubmissionScore
  draftStatus: SubmissionStatus
  draftRisks: string[]
  submissions: SubmissionRecord[]
  latestSubmission?: SubmissionRecord
  latestReportMarkdown: string
}

export const createSubmissionStorageKey = (session: AcademySession) =>
  [
    'submission-inbox',
    session.contract_version,
    session.lab_name,
    session.student_name,
    session.created_at
  ].join(':')

export const buildSubmissionInboxState = (
  session: AcademySession,
  localState?: Partial<SubmissionLocalState> | null
): SubmissionInboxState => {
  const sessionKey = createSubmissionStorageKey(session)
  const normalized = normalizeSubmissionLocalState(localState)
  const checklist = buildSubmissionChecklist(session)
  const draft = normalized.draft
  const draftScore = scoreDraft(draft, checklist)
  const submissions = normalized.submissions
    .filter(record => record.sessionKey === sessionKey)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  const latestSubmission = submissions[0]

  return {
    title: `${session.student_name} · ${session.lab_name}`,
    sessionKey,
    checklist,
    draft,
    draftScore,
    draftStatus: statusFromScore(draftScore),
    draftRisks: createDraftRisks(draft, checklist),
    submissions,
    latestSubmission,
    latestReportMarkdown: latestSubmission
      ? createSubmissionReportMarkdown(latestSubmission)
      : createDraftReportMarkdown(session, draft, checklist)
  }
}

export const buildSubmissionChecklist = (
  session: AcademySession
): SubmissionChecklistItem[] => {
  const selfCheckCommands = session.control_plane?.student_mode.self_check_commands ?? []
  const selfCheck = selfCheckCommands.length > 0
    ? [createSelfCheckItem(selfCheckCommands)]
    : []
  const skillItems = session.skill_graph.map(createSkillItem)
  const nextLesson = session.control_plane?.next_lesson
    ? [createNextLessonItem(session.control_plane.next_lesson)]
    : []

  return uniqueById([...selfCheck, ...skillItems, ...nextLesson])
}

export const updateSubmissionDraftEvidence = (
  draft: SubmissionDraft,
  itemId: string,
  value: string
): SubmissionDraft => ({
  evidenceByItem: {
    ...draft.evidenceByItem,
    [itemId]: value
  }
})

export const createSubmissionRecord = (
  session: AcademySession,
  draft: SubmissionDraft,
  checklist: SubmissionChecklistItem[],
  createdAt: Date = new Date()
): SubmissionRecord => {
  const score = scoreDraft(draft, checklist)
  const timestamp = createdAt.toISOString()

  return {
    id: [
      'submission',
      slug(session.lab_name),
      slug(session.student_name),
      timestamp
    ].join(':'),
    sessionKey: createSubmissionStorageKey(session),
    studentName: session.student_name,
    labName: session.lab_name,
    createdAt: timestamp,
    status: statusFromScore(score),
    score,
    evidence: checklist.map(item => createEvidenceEntry(item, draft)),
    nextLesson: session.control_plane?.next_lesson
  }
}

export const addSubmissionRecord = (
  localState: SubmissionLocalState,
  record: SubmissionRecord
): SubmissionLocalState => ({
  draft: localState.draft,
  submissions: [record, ...localState.submissions.filter(item => item.id !== record.id)]
})

export const createSubmissionReportMarkdown = (record: SubmissionRecord) => {
  const lines = [
    `# Homework Submission: ${record.studentName} · ${record.labName}`,
    '',
    `Status: ${record.status}`,
    `Completeness: ${record.score.completed}/${record.score.total} (${record.score.percent}%)`,
    `Submitted at: ${record.createdAt}`,
    '',
    '## Evidence',
    ...record.evidence.map(item =>
      `- ${item.isComplete ? '[x]' : '[ ]'} ${item.title}: ${item.value || 'missing'}`
    ),
    ''
  ]

  if (record.nextLesson) {
    lines.push(
      `Next lesson: ${record.nextLesson.title}`,
      `Next lesson path: ${record.nextLesson.path}`,
      ''
    )
  }

  return lines.join('\n')
}

export const normalizeSubmissionLocalState = (
  value?: Partial<SubmissionLocalState> | null
): SubmissionLocalState => ({
  draft: normalizeDraft(value?.draft),
  submissions: Array.isArray(value?.submissions)
    ? value.submissions.filter(isSubmissionRecord)
    : []
})

const createSelfCheckItem = (commands: string[]): SubmissionChecklistItem => ({
  id: 'self-check',
  title: 'Self-check commands',
  prompt: 'Вставь вывод self-check команд или кратко зафиксируй, что прошло успешно.',
  reference: commands.join('\n'),
  acceptedSignals: commands
})

const createSkillItem = (skill: SkillNode): SubmissionChecklistItem => ({
  id: `skill:${skill.code}`,
  title: skill.title,
  prompt: skill.evidence,
  reference: skill.level,
  acceptedSignals: [skill.evidence]
})

const createNextLessonItem = (nextLesson: NextLesson): SubmissionChecklistItem => ({
  id: 'next-lesson',
  title: 'Next lesson readiness',
  prompt: 'Кратко напиши, что готов принести на следующий урок и какие вопросы остались.',
  reference: `${nextLesson.title}\n${nextLesson.path}`,
  acceptedSignals: [nextLesson.title, nextLesson.path]
})

const scoreDraft = (
  draft: SubmissionDraft,
  checklist: SubmissionChecklistItem[]
): SubmissionScore => {
  const completed = checklist.filter(item => isComplete(draft.evidenceByItem[item.id])).length

  return {
    completed,
    total: checklist.length,
    percent: checklist.length === 0 ? 0 : Math.round((completed / checklist.length) * 100)
  }
}

const statusFromScore = (score: SubmissionScore): SubmissionStatus =>
  score.total > 0 && score.completed === score.total ? 'ready-for-review' : 'needs-evidence'

const createDraftRisks = (
  draft: SubmissionDraft,
  checklist: SubmissionChecklistItem[]
) =>
  checklist
    .filter(item => !isComplete(draft.evidenceByItem[item.id]))
    .map(item => `Missing evidence: ${item.title}. ${firstSignal(item)}`)

const createEvidenceEntry = (
  item: SubmissionChecklistItem,
  draft: SubmissionDraft
): SubmissionEvidenceEntry => {
  const value = normalizeText(draft.evidenceByItem[item.id])

  return {
    id: item.id,
    title: item.title,
    prompt: item.prompt,
    value,
    isComplete: isComplete(value)
  }
}

const createDraftReportMarkdown = (
  session: AcademySession,
  draft: SubmissionDraft,
  checklist: SubmissionChecklistItem[]
) => createSubmissionReportMarkdown(
  createSubmissionRecord(session, draft, checklist, new Date(session.created_at))
)

const normalizeDraft = (value: unknown): SubmissionDraft => ({
  evidenceByItem: isStringRecord((value as SubmissionDraft | undefined)?.evidenceByItem)
    ? (value as SubmissionDraft).evidenceByItem
    : {}
})

const isSubmissionRecord = (value: unknown): value is SubmissionRecord =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.sessionKey === 'string' &&
  typeof value.studentName === 'string' &&
  typeof value.labName === 'string' &&
  typeof value.createdAt === 'string' &&
  (value.status === 'needs-evidence' || value.status === 'ready-for-review') &&
  isSubmissionScore(value.score) &&
  Array.isArray(value.evidence)

const isSubmissionScore = (value: unknown): value is SubmissionScore =>
  isRecord(value) &&
  typeof value.completed === 'number' &&
  typeof value.total === 'number' &&
  typeof value.percent === 'number'

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every(item => typeof item === 'string')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeText = (value: unknown) => typeof value === 'string' ? value.trim() : ''

const isComplete = (value: unknown) => normalizeText(value).length >= 8

const firstSignal = (item: SubmissionChecklistItem) =>
  item.acceptedSignals[0] ? `Expected: ${item.acceptedSignals[0]}` : item.prompt

const slug = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '')

const uniqueById = (items: SubmissionChecklistItem[]) => {
  const seen = new Set<string>()

  return items.filter(item => {
    if (seen.has(item.id)) {
      return false
    }
    seen.add(item.id)
    return true
  })
}
