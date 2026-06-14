import type {
  AcademySession,
  SkillNode
} from '../../core/session/domain/academy-session.ts'
import type { NextLesson } from '../../core/session/domain/control-plane.ts'
import { createMentorStorageKey } from '../mentor-cockpit/mentor-cockpit-state.ts'
import {
  buildReviewCenterState,
  normalizeReviewLocalState,
  type ReviewLocalState
} from '../review-center/review-center-state.ts'
import {
  buildSubmissionInboxState,
  createSubmissionStorageKey,
  normalizeSubmissionLocalState,
  type SubmissionLocalState
} from '../submission-inbox/submission-inbox-state.ts'

export type CohortFilterStatus = 'all' | 'risks' | 'ready-submissions'
export type LearnerStatus = 'on-track' | 'in-review' | 'needs-attention'
export type CohortSubmissionStatus = 'not-submitted' | 'needs-evidence' | 'ready-for-review'
export type SkillEvidenceStatus = 'confirmed' | 'gap'

export interface CohortFilters {
  status: CohortFilterStatus
}

export interface CohortSessionSource {
  session: AcademySession
  source: string
  importedAt?: string
}

export interface CohortStorageSnapshots {
  mentorStates?: Record<string, Partial<ReviewLocalState> | unknown>
  submissionStates?: Record<string, Partial<SubmissionLocalState> | unknown>
}

export interface CohortMetrics {
  learnerCount: number
  averageEvidencePercent: number
  readySubmissionCount: number
  highRiskCount: number
}

export interface CohortSkillStatus {
  code: string
  title: string
  status: SkillEvidenceStatus
}

export interface CohortLearnerCard {
  id: string
  source: string
  studentName: string
  labName: string
  currentStageTitle: string
  evidencePercent: number
  evidenceScoreLabel: string
  submissionStatus: CohortSubmissionStatus
  submissionPercent: number
  learnerStatus: LearnerStatus
  risks: string[]
  riskCount: number
  nextLesson?: NextLesson
  skillStatuses: CohortSkillStatus[]
}

export interface CohortSkillHeatmapItem {
  code: string
  title: string
  confirmedCount: number
  gapCount: number
}

export interface CohortDashboardState {
  filters: CohortFilters
  metrics: CohortMetrics
  cards: CohortLearnerCard[]
  visibleCards: CohortLearnerCard[]
  skillHeatmap: CohortSkillHeatmapItem[]
  reportMarkdown: string
}

export const buildCohortDashboardState = (
  sources: CohortSessionSource[],
  snapshots: CohortStorageSnapshots = {},
  filters?: Partial<CohortFilters> | null
): CohortDashboardState => {
  const normalizedFilters = normalizeCohortFilters(filters)
  const cards = uniqueSessionSources(sources).map(source =>
    createLearnerCard(source, snapshots)
  )
  const visibleCards = filterCohortCards(cards, normalizedFilters)
  const state = {
    filters: normalizedFilters,
    metrics: createMetrics(cards),
    cards,
    visibleCards,
    skillHeatmap: createSkillHeatmap(cards),
    reportMarkdown: ''
  }

  return {
    ...state,
    reportMarkdown: createCohortReportMarkdown(state)
  }
}

export const normalizeCohortFilters = (
  value?: Partial<CohortFilters> | null
): CohortFilters => ({
  status: value?.status === 'risks' || value?.status === 'ready-submissions'
    ? value.status
    : 'all'
})

export const createCohortReportMarkdown = (
  state: Pick<CohortDashboardState, 'metrics' | 'visibleCards' | 'filters'>
) => {
  const lines = [
    '# Cohort Progress Dashboard',
    '',
    `Learners: ${state.metrics.learnerCount}`,
    `Average evidence: ${state.metrics.averageEvidencePercent}%`,
    `Ready submissions: ${state.metrics.readySubmissionCount}`,
    `High risk learners: ${state.metrics.highRiskCount}`,
    `Filter: ${state.filters.status}`,
    '',
    '## Learners',
    ...state.visibleCards.flatMap(card => [
      `- ${card.studentName} · ${card.labName}`,
      `  - Evidence: ${card.evidenceScoreLabel}`,
      `  - Submission: ${card.submissionStatus} (${card.submissionPercent}%)`,
      `  - Status: ${card.learnerStatus}`,
      `  - Next: ${card.nextLesson?.title ?? 'not planned'}`,
      `  - Risks: ${card.risks.length > 0 ? card.risks.join('; ') : 'none'}`
    ]),
    ''
  ]

  return lines.join('\n')
}

const createLearnerCard = (
  source: CohortSessionSource,
  snapshots: CohortStorageSnapshots
): CohortLearnerCard => {
  const mentorState = normalizeReviewLocalState(
    snapshots.mentorStates?.[createMentorStorageKey(source.session)]
  )
  const review = buildReviewCenterState(source.session, mentorState)
  const submission = buildSubmissionInboxState(
    source.session,
    normalizeSubmissionLocalState(
      snapshots.submissionStates?.[createSubmissionStorageKey(source.session)]
    )
  )
  const latestSubmission = submission.latestSubmission
  const submissionStatus: CohortSubmissionStatus = latestSubmission?.status ?? 'not-submitted'
  const submissionPercent = latestSubmission?.score.percent ?? submission.draftScore.percent
  const risks = [
    ...review.risks,
    ...submissionRisks(submissionStatus, submissionPercent)
  ]

  return {
    id: createCohortSessionIdentity(source.session),
    source: source.source,
    studentName: source.session.student_name,
    labName: source.session.lab_name,
    currentStageTitle: source.session.current_stage.title,
    evidencePercent: review.evidenceScore.percent,
    evidenceScoreLabel: `${review.evidenceScore.checked}/${review.evidenceScore.total} (${review.evidenceScore.percent}%)`,
    submissionStatus,
    submissionPercent,
    learnerStatus: learnerStatusFor(review.evidenceScore.percent, risks.length, submissionStatus),
    risks,
    riskCount: risks.length,
    nextLesson: review.nextLesson,
    skillStatuses: createSkillStatuses(source.session.skill_graph, mentorState)
  }
}

const createCohortSessionIdentity = (session: AcademySession) =>
  [
    session.contract_version,
    session.lab_name,
    session.student_name,
    session.created_at
  ].join(':')

const createSkillStatuses = (
  skills: SkillNode[],
  mentorState: ReviewLocalState
): CohortSkillStatus[] => {
  const checked = new Set(mentorState.checkedEvidence)

  return skills.map(skill => ({
    code: skill.code,
    title: skill.title,
    status: checked.has(skill.code) || checked.has(skill.title) ? 'confirmed' : 'gap'
  }))
}

const submissionRisks = (
  status: CohortSubmissionStatus,
  percent: number
) => {
  if (status === 'ready-for-review') {
    return []
  }

  return [
    status === 'not-submitted'
      ? 'Submission missing: homework has not been sent yet.'
      : `Submission incomplete: ${percent}% complete.`
  ]
}

const learnerStatusFor = (
  evidencePercent: number,
  riskCount: number,
  submissionStatus: CohortSubmissionStatus
): LearnerStatus => {
  if (riskCount >= 2 || evidencePercent < 50) {
    return 'needs-attention'
  }

  return submissionStatus === 'ready-for-review' ? 'in-review' : 'on-track'
}

const createMetrics = (cards: CohortLearnerCard[]): CohortMetrics => {
  const evidenceSum = cards.reduce((sum, card) => sum + card.evidencePercent, 0)

  return {
    learnerCount: cards.length,
    averageEvidencePercent: cards.length === 0 ? 0 : Math.round(evidenceSum / cards.length),
    readySubmissionCount: cards.filter(card => card.submissionStatus === 'ready-for-review').length,
    highRiskCount: cards.filter(card => card.riskCount > 0).length
  }
}

const filterCohortCards = (
  cards: CohortLearnerCard[],
  filters: CohortFilters
) => {
  if (filters.status === 'risks') {
    return cards.filter(card => card.riskCount > 0)
  }

  if (filters.status === 'ready-submissions') {
    return cards.filter(card => card.submissionStatus === 'ready-for-review')
  }

  return cards
}

const createSkillHeatmap = (
  cards: CohortLearnerCard[]
): CohortSkillHeatmapItem[] => {
  const heatmap = new Map<string, CohortSkillHeatmapItem>()

  for (const card of cards) {
    for (const skill of card.skillStatuses) {
      const key = `${skill.code}:${skill.title}`
      const current = heatmap.get(key) ?? {
        code: skill.code,
        title: skill.title,
        confirmedCount: 0,
        gapCount: 0
      }
      if (skill.status === 'confirmed') {
        current.confirmedCount += 1
      } else {
        current.gapCount += 1
      }
      heatmap.set(key, current)
    }
  }

  return [...heatmap.values()].sort((left, right) => left.title.localeCompare(right.title))
}

const uniqueSessionSources = (
  sources: CohortSessionSource[]
): CohortSessionSource[] => {
  const seen = new Set<string>()

  return sources.filter(source => {
    const key = createCohortSessionIdentity(source.session)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}
