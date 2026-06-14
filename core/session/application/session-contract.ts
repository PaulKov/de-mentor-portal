import {
  CONTRACT_VERSION,
  PORTAL_APP_PATH,
  PORTAL_FRAMEWORK,
  PORTAL_REPOSITORY,
  PORTAL_SESSION_ENV,
  type AcademySession
} from '../domain/academy-session'

export interface ValidationIssue {
  path: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
  session?: AcademySession
}

type UnknownRecord = Record<string, unknown>

const SESSION_STRING_FIELDS = [
  'academy_version',
  'lab_name',
  'student_name',
  'created_at'
]

const STAGE_STRING_FIELDS = [
  'code',
  'title',
  'timebox',
  'mentor_focus',
  'student_action',
  'command'
]

const SKILL_STRING_FIELDS = ['code', 'title', 'level', 'evidence']
const EVENT_STRING_FIELDS = ['event_type', 'note', 'created_at']

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export class AcademySessionContractValidator {
  validate(payload: unknown): ValidationResult {
    const issues: ValidationIssue[] = []

    if (!isRecord(payload)) {
      return {
        valid: false,
        issues: [{ path: '$', message: 'session payload should be an object' }]
      }
    }

    this.validateContractVersion(payload, issues)
    this.validateTopLevelStrings(payload, issues)
    this.validateStages(payload, issues)
    this.validateSkills(payload, issues)
    this.validateCommands(payload, issues)
    this.validateEvents(payload, issues)
    this.validatePortal(payload, issues)

    return {
      valid: issues.length === 0,
      issues,
      session: issues.length === 0 ? (payload as AcademySession) : undefined
    }
  }

  private validateContractVersion(payload: UnknownRecord, issues: ValidationIssue[]) {
    if (payload.contract_version !== CONTRACT_VERSION) {
      issues.push({
        path: 'contract_version',
        message: `contract_version should be ${CONTRACT_VERSION}`
      })
    }
  }

  private validateTopLevelStrings(payload: UnknownRecord, issues: ValidationIssue[]) {
    for (const field of SESSION_STRING_FIELDS) {
      this.requireString(payload[field], field, issues)
    }
  }

  private validateStages(payload: UnknownRecord, issues: ValidationIssue[]) {
    this.validateStage(payload.current_stage, 'current_stage', issues)

    if (!Array.isArray(payload.stages)) {
      issues.push({ path: 'stages', message: 'stages should be an array' })
      return
    }

    if (payload.stages.length === 0) {
      issues.push({ path: 'stages', message: 'stages should contain at least one stage' })
    }

    payload.stages.forEach((stage, index) => {
      this.validateStage(stage, `stages[${index}]`, issues)
    })

    if (
      isRecord(payload.current_stage) &&
      typeof payload.current_stage.code === 'string' &&
      !payload.stages.some(stage => isRecord(stage) && stage.code === payload.current_stage.code)
    ) {
      issues.push({
        path: 'current_stage.code',
        message: 'current_stage should be present in stages'
      })
    }
  }

  private validateStage(value: unknown, path: string, issues: ValidationIssue[]) {
    if (!isRecord(value)) {
      issues.push({ path, message: `${path} should be an object` })
      return
    }

    for (const field of STAGE_STRING_FIELDS) {
      this.requireString(value[field], `${path}.${field}`, issues)
    }
  }

  private validateSkills(payload: UnknownRecord, issues: ValidationIssue[]) {
    if (!Array.isArray(payload.skill_graph)) {
      issues.push({ path: 'skill_graph', message: 'skill_graph should be an array' })
      return
    }

    payload.skill_graph.forEach((skill, index) => {
      if (!isRecord(skill)) {
        issues.push({ path: `skill_graph[${index}]`, message: 'skill should be an object' })
        return
      }

      for (const field of SKILL_STRING_FIELDS) {
        this.requireString(skill[field], `skill_graph[${index}].${field}`, issues)
      }
    })
  }

  private validateCommands(payload: UnknownRecord, issues: ValidationIssue[]) {
    if (!Array.isArray(payload.commands)) {
      issues.push({ path: 'commands', message: 'commands should be an array' })
      return
    }

    payload.commands.forEach((command, index) => {
      this.requireString(command, `commands[${index}]`, issues)
    })
  }

  private validateEvents(payload: UnknownRecord, issues: ValidationIssue[]) {
    if (!Array.isArray(payload.events)) {
      issues.push({ path: 'events', message: 'events should be an array' })
      return
    }

    payload.events.forEach((event, index) => {
      if (!isRecord(event)) {
        issues.push({ path: `events[${index}]`, message: 'event should be an object' })
        return
      }

      for (const field of EVENT_STRING_FIELDS) {
        this.requireString(event[field], `events[${index}].${field}`, issues)
      }
    })
  }

  private validatePortal(payload: UnknownRecord, issues: ValidationIssue[]) {
    if (!isRecord(payload.portal)) {
      issues.push({ path: 'portal', message: 'portal should be an object' })
      return
    }

    this.requireConst(payload.portal.framework, PORTAL_FRAMEWORK, 'portal.framework', issues)
    this.requireConst(payload.portal.repository, PORTAL_REPOSITORY, 'portal.repository', issues)
    this.requireConst(payload.portal.app_path, PORTAL_APP_PATH, 'portal.app_path', issues)
    this.requireConst(payload.portal.session_env, PORTAL_SESSION_ENV, 'portal.session_env', issues)
    this.requireString(payload.portal.dev_command, 'portal.dev_command', issues)
  }

  private requireString(value: unknown, path: string, issues: ValidationIssue[]) {
    if (typeof value !== 'string' || value.length === 0) {
      issues.push({ path, message: `${path} should be a non-empty string` })
    }
  }

  private requireConst(
    value: unknown,
    expected: string,
    path: string,
    issues: ValidationIssue[]
  ) {
    if (value !== expected) {
      issues.push({ path, message: `${path} should be ${expected}` })
    }
  }
}
