import type {
  AcademySession,
  HomeworkReview,
  HomeworkRubricItem,
  HomeworkChecklistItem,
  HomeworkSqlSnippet
} from '../../core/session/domain/academy-session.ts'

export interface HomeworkReviewFlags {
  needs_follow_up: boolean
  ready_for_lesson_02: boolean
  next_plan_sent: boolean
}

export interface HomeworkReviewLocalState {
  checkedRubric: string[]
  checkedChecklist: string[]
  notes: string
  conclusionText: string
  selectedRubricCode?: string
  flags: HomeworkReviewFlags
}

export interface HomeworkReviewProgress {
  checked: number
  total: number
}

export type HomeworkReviewStudioState =
  | {
      available: false
      reason: 'homework_review missing'
    }
  | {
      available: true
      title: string
      statusLabel: string
      scoreLabel: string
      acceptanceLabel: string
      rubricItems: HomeworkRubricItem[]
      liveChecklist: HomeworkChecklistItem[]
      sqlSnippets: HomeworkSqlSnippet[]
      selectedRubric: HomeworkRubricItem
      rubricProgress: HomeworkReviewProgress
      checklistProgress: HomeworkReviewProgress
      missingEvidence: string[]
      nextActions: string[]
      mentorSummary: string
      mentorRecommendation: string
      nextPlanMarkdown: string
      localState: HomeworkReviewLocalState
    }

export const createHomeworkReviewStorageKey = (session: AcademySession) =>
  [
    'homework-review',
    session.contract_version,
    session.lab_name,
    session.student_name,
    session.created_at
  ].join(':')

export const buildHomeworkReviewStudioState = (
  session: AcademySession,
  localState?: Partial<HomeworkReviewLocalState> | null
): HomeworkReviewStudioState => {
  const review = session.homework_review
  if (!review) {
    return {
      available: false,
      reason: 'homework_review missing'
    }
  }

  const normalizedLocalState = normalizeHomeworkReviewLocalState(localState, review)
  const selectedRubric = selectRubricItem(review, normalizedLocalState.selectedRubricCode)

  return {
    available: true,
    title: review.title,
    statusLabel: review.submission_status === 'submitted' ? 'Сдано' : 'Не сдано',
    scoreLabel: `${review.score}/100`,
    acceptanceLabel: review.accepted ? 'Принято' : 'Нужен разбор',
    rubricItems: review.rubric_items,
    liveChecklist: review.live_checklist,
    sqlSnippets: review.sql_snippets,
    selectedRubric,
    rubricProgress: progress(normalizedLocalState.checkedRubric, review.rubric_items),
    checklistProgress: progress(normalizedLocalState.checkedChecklist, review.live_checklist),
    missingEvidence: review.missing_evidence,
    nextActions: review.next_actions,
    mentorSummary: review.mentor_conclusion.summary,
    mentorRecommendation: review.mentor_conclusion.recommendation,
    nextPlanMarkdown: createNextPlanMarkdown(review),
    localState: normalizedLocalState
  }
}

export const normalizeHomeworkReviewLocalState = (
  state?: Partial<HomeworkReviewLocalState> | null,
  review?: HomeworkReview
): HomeworkReviewLocalState => {
  const rubricCodes = new Set(review?.rubric_items.map(item => item.code) ?? [])
  const checklistCodes = new Set(review?.live_checklist.map(item => item.code) ?? [])
  const selectedRubricCode = normalizeSelectedRubricCode(state?.selectedRubricCode, rubricCodes)

  return {
    checkedRubric: normalizeCodes(state?.checkedRubric, rubricCodes),
    checkedChecklist: normalizeCodes(state?.checkedChecklist, checklistCodes),
    notes: typeof state?.notes === 'string' ? state.notes : '',
    conclusionText: typeof state?.conclusionText === 'string' ? state.conclusionText : '',
    selectedRubricCode,
    flags: normalizeFlags(state?.flags)
  }
}

export const createEmptyHomeworkReviewLocalState = (): HomeworkReviewLocalState => ({
  checkedRubric: [],
  checkedChecklist: [],
  notes: '',
  conclusionText: '',
  selectedRubricCode: undefined,
  flags: {
    needs_follow_up: false,
    ready_for_lesson_02: false,
    next_plan_sent: false
  }
})

export const createNextPlanMarkdown = (review: HomeworkReview) => [
  `# ${review.next_lesson_plan.title}`,
  '',
  `Lesson: ${review.next_lesson_plan.lesson_code}`,
  `Focus: ${review.next_lesson_plan.focus}`,
  '',
  '## Action items',
  ...review.next_lesson_plan.action_items.map(item => `- ${item}`),
  '',
  '## Commands',
  ...review.next_lesson_plan.commands.map(command => `- \`${command}\``)
].join('\n')

const selectRubricItem = (review: HomeworkReview, selectedCode?: string) =>
  review.rubric_items.find(item => item.code === selectedCode) ??
  review.rubric_items.find(item => !item.passed) ??
  review.rubric_items[0]

const progress = (
  checkedCodes: string[],
  items: Array<{ code: string }>
): HomeworkReviewProgress => ({
  checked: checkedCodes.length,
  total: items.length
})

const normalizeCodes = (value: unknown, allowedCodes: Set<string>) => {
  if (!Array.isArray(value)) {
    return []
  }

  const knownCodes = value.filter(code => typeof code === 'string' && allowedCodes.has(code))
  return Array.from(new Set(knownCodes))
}

const normalizeSelectedRubricCode = (
  value: unknown,
  allowedCodes: Set<string>
) => typeof value === 'string' && allowedCodes.has(value) ? value : undefined

const normalizeFlags = (value: unknown): HomeworkReviewFlags => {
  const flags = isRecord(value) ? value : {}
  return {
    needs_follow_up: flags.needs_follow_up === true,
    ready_for_lesson_02: flags.ready_for_lesson_02 === true,
    next_plan_sent: flags.next_plan_sent === true
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
