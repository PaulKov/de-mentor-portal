import type { AcademySession } from '../../core/session/domain/academy-session.ts'
import {
  buildEvidenceLedgerState,
  normalizeEvidenceLedgerLocalState,
  type EvidenceLedgerInput
} from '../evidence-ledger/evidence-ledger-state.ts'
import {
  buildReviewCenterState,
  createReviewReportMarkdown,
  normalizeReviewLocalState,
  type ReviewLocalState
} from '../review-center/review-center-state.ts'
import {
  buildSubmissionInboxState,
  normalizeSubmissionLocalState,
  type SubmissionLocalState
} from '../submission-inbox/submission-inbox-state.ts'

export type PostLessonPackReadiness = 'ready-to-send' | 'needs-attention'

export interface PostLessonPackInput extends Partial<ReviewLocalState>, EvidenceLedgerInput {
  submissionState?: Partial<SubmissionLocalState> | null
}

export interface PostLessonPackMetrics {
  evidencePercent: number
  homeworkPercent: number
  ledgerDeltaMinutes: number
  unresolvedCount: number
}

export interface PostLessonPackSection {
  code: string
  title: string
  items: string[]
}

export interface PostLessonPackState {
  title: string
  studentName: string
  labName: string
  readiness: PostLessonPackReadiness
  metrics: PostLessonPackMetrics
  sections: PostLessonPackSection[]
  unresolvedBlockers: string[]
  actionItems: string[]
  packetMarkdown: string
}

export interface PostLessonPackExport {
  student_name: string
  lab_name: string
  readiness: PostLessonPackReadiness
  metrics: PostLessonPackMetrics
  sections: PostLessonPackSection[]
  unresolved_blockers: string[]
  action_items: string[]
  packet_markdown: string
}

export const buildPostLessonPackState = (
  session: AcademySession,
  input: PostLessonPackInput = {}
): PostLessonPackState => {
  const reviewInput = normalizeReviewLocalState(input)
  const ledgerInput = normalizeEvidenceLedgerLocalState(input)
  const review = buildReviewCenterState(session, reviewInput)
  const ledger = buildEvidenceLedgerState(session, {
    ...ledgerInput,
    checkedEvidence: reviewInput.checkedEvidence,
    notesByStage: reviewInput.notesByStage
  })
  const submission = buildSubmissionInboxState(
    session,
    normalizeSubmissionLocalState(input.submissionState)
  )
  const unresolvedBlockers = uniqueStrings([
    ...review.risks,
    ...submissionRisks(submission)
  ])
  const readiness = unresolvedBlockers.length === 0 ? 'ready-to-send' : 'needs-attention'
  const actionItems = createActionItems(readiness)
  const sections = createSections(session, review, ledger, submission, unresolvedBlockers, actionItems)
  const state = {
    title: `${session.student_name} · ${session.lab_name}`,
    studentName: session.student_name,
    labName: session.lab_name,
    readiness,
    metrics: {
      evidencePercent: review.evidenceScore.percent,
      homeworkPercent: submission.latestSubmission?.score.percent ?? submission.draftScore.percent,
      ledgerDeltaMinutes: ledger.summary.deltaMinutes,
      unresolvedCount: unresolvedBlockers.length
    },
    sections,
    unresolvedBlockers,
    actionItems,
    packetMarkdown: ''
  }

  return {
    ...state,
    packetMarkdown: createPostLessonPackMarkdown(state)
  }
}

export const createPostLessonPackExport = (
  state: PostLessonPackState
): PostLessonPackExport => ({
  student_name: state.studentName,
  lab_name: state.labName,
  readiness: state.readiness,
  metrics: state.metrics,
  sections: state.sections,
  unresolved_blockers: state.unresolvedBlockers,
  action_items: state.actionItems,
  packet_markdown: state.packetMarkdown
})

export const createPostLessonPackMarkdown = (
  state: Omit<PostLessonPackState, 'packetMarkdown'>
) => [
  `# Post-Lesson Pack: ${state.title}`,
  '',
  `Readiness: ${state.readiness}`,
  `Evidence: ${state.metrics.evidencePercent}%`,
  `Homework: ${state.metrics.homeworkPercent}%`,
  `Unresolved: ${state.metrics.unresolvedCount}`,
  '',
  ...state.sections.flatMap(formatSection),
  ''
].join('\n')

const createSections = (
  session: AcademySession,
  review: ReturnType<typeof buildReviewCenterState>,
  ledger: ReturnType<typeof buildEvidenceLedgerState>,
  submission: ReturnType<typeof buildSubmissionInboxState>,
  unresolvedBlockers: string[],
  actionItems: string[]
): PostLessonPackSection[] => [
  {
    code: 'lesson-summary',
    title: 'Lesson Summary',
    items: [
      `Evidence: ${review.evidenceScore.checked}/${review.evidenceScore.total} (${review.evidenceScore.percent}%)`,
      `Ledger: ${ledger.summary.done}/${ledger.summary.total} done, ${ledger.summary.risk} risk, ${formatDelta(ledger.summary.deltaMinutes)} min`,
      `Homework: ${submission.latestSubmission?.status ?? submission.draftStatus}, ${homeworkScore(submission)}`
    ]
  },
  {
    code: 'learner-handoff',
    title: 'Learner Handoff',
    items: [
      ...review.strengths.slice(0, 3),
      ...review.recommendations.slice(0, 3)
    ]
  },
  {
    code: 'homework',
    title: 'Homework',
    items: [
      `Homework: ${submission.latestSubmission?.status ?? submission.draftStatus}, ${homeworkScore(submission)}`,
      submission.latestSubmission
        ? `Submitted at: ${submission.latestSubmission.createdAt}`
        : 'Submission is still a draft.'
    ]
  },
  {
    code: 'next-lesson',
    title: 'Next Lesson',
    items: review.nextLesson
      ? [
          `Next lesson: ${review.nextLesson.title}`,
          `Next lesson path: ${review.nextLesson.path}`
        ]
      : ['Next lesson is not configured.']
  },
  {
    code: 'mentor-follow-up',
    title: 'Mentor Follow-up',
    items: unresolvedBlockers.length > 0 ? unresolvedBlockers : actionItems
  }
]

const createActionItems = (readiness: PostLessonPackReadiness) =>
  readiness === 'ready-to-send'
    ? ['Отправить post-lesson pack ученику и зафиксировать переход к следующему уроку.']
    : ['Закрыть unresolved blockers перед отправкой итогового пакета.']

const submissionRisks = (submission: ReturnType<typeof buildSubmissionInboxState>) => {
  if (submission.latestSubmission?.status === 'ready-for-review') {
    return []
  }

  return submission.draftRisks
}

const homeworkScore = (submission: ReturnType<typeof buildSubmissionInboxState>) => {
  const score = submission.latestSubmission?.score ?? submission.draftScore

  return `${score.completed}/${score.total} (${score.percent}%)`
}

const formatSection = (section: PostLessonPackSection) => [
  `## ${section.title}`,
  ...section.items.map(item => `- ${item}`),
  ''
]

const formatDelta = (minutes: number) => (minutes > 0 ? `+${minutes}` : String(minutes))

const uniqueStrings = (items: string[]) => [...new Set(items.filter(item => item.trim()))]
