import type { AcademySession } from '../../core/session/domain/academy-session.ts'
import type { PortalSurface } from '../global-navigation/global-navigation-state.ts'
import {
  buildAssessmentCenterState,
  type AssessmentCenterState
} from '../assessment-center/assessment-center-state.ts'
import {
  buildEvidenceLedgerState,
  normalizeEvidenceLedgerLocalState,
  type EvidenceLedgerInput,
  type EvidenceLedgerState
} from '../evidence-ledger/evidence-ledger-state.ts'
import {
  buildPostLessonPackState,
  type PostLessonPackState
} from '../post-lesson-pack/post-lesson-pack-state.ts'
import {
  buildReviewCenterState,
  normalizeReviewLocalState,
  type ReviewCenterState,
  type ReviewLocalState
} from '../review-center/review-center-state.ts'
import {
  buildSubmissionInboxState,
  normalizeSubmissionLocalState,
  type SubmissionInboxState,
  type SubmissionLocalState
} from '../submission-inbox/submission-inbox-state.ts'

export type MissionPhase = 'before' | 'live' | 'after'
export type MissionStatus = 'ready' | 'open' | 'blocked'
export type MissionActionPriority = 'critical' | 'high' | 'normal'

export interface MissionControlInput extends Partial<ReviewLocalState>, EvidenceLedgerInput {
  catalogIsValid?: boolean
  sessionIsValid?: boolean
  submissionState?: Partial<SubmissionLocalState> | null
}

export interface MissionAction {
  code: string
  title: string
  description: string
  targetSurface: PortalSurface
  status: MissionStatus
  priority: MissionActionPriority
}

export interface MissionChecklistItem {
  code: string
  title: string
  status: MissionStatus
  detail: string
}

export interface MissionChecklistSection {
  code: MissionPhase
  title: string
  status: MissionStatus
  items: MissionChecklistItem[]
}

export interface MissionSignal {
  code: string
  label: string
  value: string
  status: MissionStatus
  detail: string
}

export interface MissionQuickLink {
  surface: PortalSurface
  label: string
  description: string
}

export interface MissionControlState {
  title: string
  studentName: string
  labName: string
  phase: MissionPhase
  nextAction: MissionAction
  checklist: MissionChecklistSection[]
  signals: MissionSignal[]
  focusQueue: MissionAction[]
  quickLinks: MissionQuickLink[]
  reportMarkdown: string
}

interface MissionSnapshots {
  review: ReviewCenterState
  ledger: EvidenceLedgerState
  submission: SubmissionInboxState
  assessment: AssessmentCenterState
  pack: PostLessonPackState
}

export const buildMissionControlState = (
  session: AcademySession,
  input: MissionControlInput = {}
): MissionControlState => {
  const normalized = normalizeMissionInput(input)
  const snapshots = createSnapshots(session, normalized)
  const phase = resolvePhase(snapshots.ledger, normalized)
  const focusQueue = createFocusQueue(snapshots)
  const state = {
    title: `${session.student_name} · ${session.lab_name}`,
    studentName: session.student_name,
    labName: session.lab_name,
    phase,
    nextAction: createNextAction(snapshots, normalized, focusQueue),
    checklist: createChecklist(snapshots, normalized),
    signals: createSignals(snapshots),
    focusQueue,
    quickLinks: createQuickLinks(),
    reportMarkdown: ''
  }

  return {
    ...state,
    reportMarkdown: createMissionControlReportMarkdown(state)
  }
}

export const createMissionControlReportMarkdown = (
  state: Omit<MissionControlState, 'reportMarkdown'>
) => [
  `# Mentor Mission Control: ${state.title}`,
  '',
  `Phase: ${state.phase}`,
  `Next action: ${state.nextAction.title}`,
  `Next action target: ${state.nextAction.targetSurface}`,
  '',
  '## Signals',
  ...state.signals.map(signal => `- ${signal.label}: ${signal.value} (${signal.status})`),
  '',
  '## Focus Queue',
  ...listOrFallback(
    state.focusQueue.map(action => `- ${action.title}: ${action.description}`),
    '- Нет открытых задач.'
  ),
  '',
  '## Journey',
  ...state.checklist.flatMap(section => [
    `- ${section.title}: ${section.status}`,
    ...section.items.map(item => `  - ${item.title}: ${item.status} — ${item.detail}`)
  ]),
  ''
].join('\n')

const normalizeMissionInput = (input: MissionControlInput) => {
  const review = normalizeReviewLocalState(input)
  const ledger = normalizeEvidenceLedgerLocalState(input)

  return {
    ...review,
    ...ledger,
    catalogIsValid: input.catalogIsValid !== false,
    sessionIsValid: input.sessionIsValid !== false,
    submissionState: normalizeSubmissionLocalState(input.submissionState)
  }
}

const createSnapshots = (
  session: AcademySession,
  input: ReturnType<typeof normalizeMissionInput>
): MissionSnapshots => {
  const review = buildReviewCenterState(session, input)
  const ledger = buildEvidenceLedgerState(session, input)
  const submission = buildSubmissionInboxState(session, input.submissionState)
  const assessment = buildAssessmentCenterState(session, {
    ...input,
    submissionState: input.submissionState
  })
  const pack = buildPostLessonPackState(session, {
    ...input,
    submissionState: input.submissionState
  })

  return { review, ledger, submission, assessment, pack }
}

const resolvePhase = (
  ledger: EvidenceLedgerState,
  input: ReturnType<typeof normalizeMissionInput>
): MissionPhase => {
  if (!input.catalogIsValid || !input.sessionIsValid) {
    return 'before'
  }

  return ledger.summary.pending > 0 ? 'live' : 'after'
}

const createNextAction = (
  snapshots: MissionSnapshots,
  input: ReturnType<typeof normalizeMissionInput>,
  focusQueue: MissionAction[]
): MissionAction => {
  const blocker = firstBlocker(snapshots.ledger)

  if (!input.sessionIsValid) {
    return action('session-invalid', 'Открыть diagnostic cockpit', 'Session невалидна или не загружена.', 'session', 'blocked', 'critical')
  }
  if (!input.catalogIsValid) {
    return action('catalog-invalid', 'Проверить release readiness', 'Catalog невалиден или недоступен.', 'release', 'blocked', 'high')
  }
  if (snapshots.ledger.summary.pending > 0) {
    return action('continue-live', 'Продолжить live lesson', 'Есть незакрытые stages в Lesson Run Evidence Ledger.', 'session', 'open', 'high')
  }
  if (blocker) {
    return action('ledger-blocker', 'Закрыть ledger blocker', blocker, 'review', 'blocked', 'critical')
  }
  if (homeworkPercent(snapshots.submission) < 100) {
    return action('homework-gap', 'Проверить homework evidence', 'Домашка еще не готова к review.', 'submission', 'open', 'high')
  }
  if (snapshots.assessment.metrics.nextLessonFocusCount > 0) {
    return action('assessment-focus', 'Закрыть skill focus', 'Есть skills, которые требуют next lesson focus.', 'assessment', 'open', 'high')
  }
  if (snapshots.pack.readiness === 'needs-attention') {
    return action('pack-attention', 'Собрать post-lesson pack', 'Итоговый пакет требует внимания перед отправкой.', 'post-lesson', 'open', 'normal')
  }

  return focusQueue[0] ?? action('next-lesson', 'Перейти к next lesson planning', 'Текущая session закрыта, можно планировать следующий урок.', 'post-lesson', 'ready', 'normal')
}

const createFocusQueue = (snapshots: MissionSnapshots): MissionAction[] => uniqueActions([
  ...(snapshots.ledger.summary.pending > 0
    ? [action('continue-live', 'Продолжить live lesson', `${snapshots.ledger.summary.pending} stages еще pending.`, 'session', 'open', 'high')]
    : []),
  ...snapshots.ledger.rows
    .filter(row => row.blocker.trim())
    .map(row => action(
      `blocker-${row.code}`,
      `${row.title}: blocker`,
      row.blocker,
      'review',
      'blocked',
      'critical'
    )),
  ...(homeworkPercent(snapshots.submission) < 100
    ? [action('homework-gap', 'Homework evidence не закрыт', homeworkScore(snapshots.submission), 'submission', 'open', 'high')]
    : []),
  ...snapshots.assessment.focusSkills.slice(0, 3).map(skill =>
    action(`skill-${skill.code}`, `${skill.title}: skill focus`, skill.nextAction, 'assessment', 'open', 'high')
  ),
  ...snapshots.pack.unresolvedBlockers.slice(0, 3).map((item, index) =>
    action(`pack-${index}`, 'Post-lesson blocker', item, 'post-lesson', 'blocked', 'normal')
  )
])

const createChecklist = (
  snapshots: MissionSnapshots,
  input: ReturnType<typeof normalizeMissionInput>
): MissionChecklistSection[] => [
  section('before', 'Before lesson', [
    item('catalog', 'Catalog ready', input.catalogIsValid ? 'ready' : 'blocked', 'academy-catalog доступен.'),
    item('session', 'Session valid', input.sessionIsValid ? 'ready' : 'blocked', 'academy-session валидна.'),
    item('release', 'Release console', input.catalogIsValid ? 'ready' : 'open', 'Pre-flight checks доступны.')
  ]),
  section('live', 'Live lesson', [
    item('ledger', 'Ledger progress', snapshots.ledger.summary.pending === 0 ? 'ready' : 'open', `${snapshots.ledger.summary.done}/${snapshots.ledger.summary.total} done.`),
    item('evidence', 'Evidence', snapshots.review.evidenceScore.percent === 100 ? 'ready' : 'open', `${snapshots.review.evidenceScore.percent}% evidence.`),
    item('blockers', 'Blockers', firstBlocker(snapshots.ledger) ? 'blocked' : 'ready', firstBlocker(snapshots.ledger) ?? 'Открытых blockers нет.')
  ]),
  section('after', 'After lesson', [
    item('homework', 'Homework', homeworkPercent(snapshots.submission) === 100 ? 'ready' : 'open', homeworkScore(snapshots.submission)),
    item('assessment', 'Assessment', snapshots.assessment.metrics.nextLessonFocusCount === 0 ? 'ready' : 'open', `${snapshots.assessment.metrics.masteryPercent}% mastery.`),
    item('pack', 'Post-lesson pack', snapshots.pack.readiness === 'ready-to-send' ? 'ready' : 'blocked', snapshots.pack.readiness)
  ])
]

const createSignals = (snapshots: MissionSnapshots): MissionSignal[] => [
  signal('evidence', 'Evidence', `${snapshots.review.evidenceScore.percent}%`, snapshots.review.evidenceScore.percent === 100 ? 'ready' : 'open', snapshots.review.evidenceScore.checked + '/' + snapshots.review.evidenceScore.total),
  signal('ledger', 'Ledger', `${snapshots.ledger.summary.done}/${snapshots.ledger.summary.total}`, ledgerStatus(snapshots.ledger), `${snapshots.ledger.summary.risk} risk · ${snapshots.ledger.summary.pending} pending`),
  signal('homework', 'Homework', `${homeworkPercent(snapshots.submission)}%`, homeworkPercent(snapshots.submission) === 100 ? 'ready' : 'open', homeworkScore(snapshots.submission)),
  signal('assessment', 'Assessment', `${snapshots.assessment.metrics.masteryPercent}%`, snapshots.assessment.metrics.nextLessonFocusCount === 0 ? 'ready' : 'open', `${snapshots.assessment.metrics.nextLessonFocusCount} focus`),
  signal('pack', 'Post-Lesson Pack', snapshots.pack.readiness, snapshots.pack.readiness === 'ready-to-send' ? 'ready' : 'blocked', `${snapshots.pack.metrics.unresolvedCount} unresolved`)
]

const createQuickLinks = (): MissionQuickLink[] => [
  { surface: 'session', label: 'Открыть cockpit', description: 'Вернуться к live delivery и ledger.' },
  { surface: 'review', label: 'Открыть review', description: 'Проверить handoff, risks и recommendations.' },
  { surface: 'assessment', label: 'Открыть assessment', description: 'Разобрать mastery и focus skills.' },
  { surface: 'submission', label: 'Открыть submissions', description: 'Проверить homework evidence.' },
  { surface: 'cohort', label: 'Открыть cohort', description: 'Посмотреть learner overview.' },
  { surface: 'post-lesson', label: 'Открыть pack', description: 'Собрать итоговый пакет после урока.' }
]

const action = (
  code: string,
  title: string,
  description: string,
  targetSurface: PortalSurface,
  status: MissionStatus,
  priority: MissionActionPriority
): MissionAction => ({ code, title, description, targetSurface, status, priority })

const section = (
  code: MissionPhase,
  title: string,
  items: MissionChecklistItem[]
): MissionChecklistSection => ({
  code,
  title,
  status: sectionStatus(items),
  items
})

const item = (
  code: string,
  title: string,
  status: MissionStatus,
  detail: string
): MissionChecklistItem => ({ code, title, status, detail })

const signal = (
  code: string,
  label: string,
  value: string,
  status: MissionStatus,
  detail: string
): MissionSignal => ({ code, label, value, status, detail })

const sectionStatus = (items: MissionChecklistItem[]): MissionStatus =>
  items.some(entry => entry.status === 'blocked')
    ? 'blocked'
    : items.every(entry => entry.status === 'ready') ? 'ready' : 'open'

const ledgerStatus = (ledger: EvidenceLedgerState): MissionStatus =>
  firstBlocker(ledger) || ledger.summary.risk > 0 || ledger.summary.skipped > 0
    ? 'blocked'
    : ledger.summary.pending > 0 ? 'open' : 'ready'

const firstBlocker = (ledger: EvidenceLedgerState) =>
  ledger.rows.find(row => row.blocker.trim())?.blocker.trim() ?? ''

const homeworkPercent = (submission: SubmissionInboxState) =>
  (submission.latestSubmission?.score ?? submission.draftScore).percent

const homeworkScore = (submission: SubmissionInboxState) => {
  const score = submission.latestSubmission?.score ?? submission.draftScore

  return `${score.completed}/${score.total} (${score.percent}%)`
}

const uniqueActions = (actions: MissionAction[]) => {
  const seen = new Set<string>()

  return actions.filter(action => {
    if (seen.has(action.code)) {
      return false
    }
    seen.add(action.code)
    return true
  })
}

const listOrFallback = (items: string[], fallback: string) =>
  items.length > 0 ? items : [fallback]
