import type { ValidationIssue } from './session-contract'

type UnknownRecord = Record<string, unknown>

const HOMEWORK_REVIEW_STRING_FIELDS = ['lesson_code', 'title']

const RUBRIC_STRING_FIELDS = [
  'code',
  'title',
  'expected_evidence',
  'mentor_prompt',
  'conclusion_hint'
]

const CHECKLIST_STRING_FIELDS = ['code', 'label']
const SQL_SNIPPET_STRING_FIELDS = ['title', 'command', 'explanation']
const CONCLUSION_STRING_FIELDS = ['decision', 'summary', 'recommendation']
const NEXT_LESSON_STRING_FIELDS = ['lesson_code', 'title', 'focus']

export const validateHomeworkReview = (
  value: unknown,
  issues: ValidationIssue[]
) => {
  if (value === undefined) {
    return
  }

  if (!isRecord(value)) {
    issues.push({ path: 'homework_review', message: 'homework_review should be an object' })
    return
  }

  for (const field of HOMEWORK_REVIEW_STRING_FIELDS) {
    requireString(value[field], `homework_review.${field}`, issues)
  }
  requireStringValue(value.submission_path, 'homework_review.submission_path', issues)
  validateSubmissionStatus(value.submission_status, issues)
  requireNumber(value.score, 'homework_review.score', issues)
  requireBoolean(value.accepted, 'homework_review.accepted', issues)
  validateRubricItems(value.rubric_items, issues)
  validateStringArray(value.missing_evidence, 'homework_review.missing_evidence', issues)
  validateStringArray(value.next_actions, 'homework_review.next_actions', issues)
  validateChecklist(value.live_checklist, issues)
  validateSqlSnippets(value.sql_snippets, issues)
  validateConclusion(value.mentor_conclusion, issues)
  validateNextLessonPlan(value.next_lesson_plan, issues)
}

const validateSubmissionStatus = (value: unknown, issues: ValidationIssue[]) => {
  if (value !== 'submitted' && value !== 'not_submitted') {
    issues.push({
      path: 'homework_review.submission_status',
      message: 'homework_review.submission_status should be submitted or not_submitted'
    })
  }
}

const validateRubricItems = (value: unknown, issues: ValidationIssue[]) => {
  validateObjectArray(value, 'homework_review.rubric_items', issues, (item, path) => {
    for (const field of RUBRIC_STRING_FIELDS) {
      requireString(item[field], `${path}.${field}`, issues)
    }
    requireNumber(item.score, `${path}.score`, issues)
    requireBoolean(item.passed, `${path}.passed`, issues)
  })
}

const validateChecklist = (value: unknown, issues: ValidationIssue[]) => {
  validateObjectArray(value, 'homework_review.live_checklist', issues, (item, path) => {
    for (const field of CHECKLIST_STRING_FIELDS) {
      requireString(item[field], `${path}.${field}`, issues)
    }
    requireBoolean(item.done, `${path}.done`, issues)
  })
}

const validateSqlSnippets = (value: unknown, issues: ValidationIssue[]) => {
  validateObjectArray(value, 'homework_review.sql_snippets', issues, (item, path) => {
    for (const field of SQL_SNIPPET_STRING_FIELDS) {
      requireString(item[field], `${path}.${field}`, issues)
    }
  })
}

const validateConclusion = (value: unknown, issues: ValidationIssue[]) => {
  if (!isRecord(value)) {
    issues.push({
      path: 'homework_review.mentor_conclusion',
      message: 'homework_review.mentor_conclusion should be an object'
    })
    return
  }

  for (const field of CONCLUSION_STRING_FIELDS) {
    requireString(value[field], `homework_review.mentor_conclusion.${field}`, issues)
  }
}

const validateNextLessonPlan = (value: unknown, issues: ValidationIssue[]) => {
  if (!isRecord(value)) {
    issues.push({
      path: 'homework_review.next_lesson_plan',
      message: 'homework_review.next_lesson_plan should be an object'
    })
    return
  }

  for (const field of NEXT_LESSON_STRING_FIELDS) {
    requireString(value[field], `homework_review.next_lesson_plan.${field}`, issues)
  }
  validateStringArray(value.action_items, 'homework_review.next_lesson_plan.action_items', issues)
  validateStringArray(value.commands, 'homework_review.next_lesson_plan.commands', issues)
}

const validateObjectArray = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  validateItem: (item: UnknownRecord, path: string) => void
) => {
  if (!Array.isArray(value)) {
    issues.push({ path, message: `${path} should be an array` })
    return
  }

  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`
    if (!isRecord(item)) {
      issues.push({ path: itemPath, message: `${itemPath} should be an object` })
      return
    }
    validateItem(item, itemPath)
  })
}

const validateStringArray = (value: unknown, path: string, issues: ValidationIssue[]) => {
  if (!Array.isArray(value)) {
    issues.push({ path, message: `${path} should be an array` })
    return
  }

  value.forEach((item, index) => {
    requireString(item, `${path}[${index}]`, issues)
  })
}

const requireString = (value: unknown, path: string, issues: ValidationIssue[]) => {
  if (typeof value !== 'string' || value.length === 0) {
    issues.push({ path, message: `${path} should be a non-empty string` })
  }
}

const requireStringValue = (value: unknown, path: string, issues: ValidationIssue[]) => {
  if (typeof value !== 'string') {
    issues.push({ path, message: `${path} should be a string` })
  }
}

const requireNumber = (value: unknown, path: string, issues: ValidationIssue[]) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    issues.push({ path, message: `${path} should be a number` })
  }
}

const requireBoolean = (value: unknown, path: string, issues: ValidationIssue[]) => {
  if (typeof value !== 'boolean') {
    issues.push({ path, message: `${path} should be a boolean` })
  }
}

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
