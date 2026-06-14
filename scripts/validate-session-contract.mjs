#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

const CONTRACT_VERSION = 'academy-session/v1'
const PORTAL_FRAMEWORK = 'Vue 3 + Nuxt 3 + Vite'
const PORTAL_REPOSITORY = 'https://github.com/PaulKov/de-mentor-portal'
const PORTAL_APP_PATH = 'de-mentor-portal'
const PORTAL_SESSION_ENV = 'MENTOR_LAB_SESSION'

const sessionStringFields = [
  'academy_version',
  'lab_name',
  'student_name',
  'created_at'
]

const stageStringFields = [
  'code',
  'title',
  'timebox',
  'mentor_focus',
  'student_action',
  'command'
]

const skillStringFields = ['code', 'title', 'level', 'evidence']
const eventStringFields = ['event_type', 'note', 'created_at']

const isRecord = value =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const requireString = (value, path, issues) => {
  if (typeof value !== 'string' || value.length === 0) {
    issues.push({ path, message: `${path} should be a non-empty string` })
  }
}

const requireConst = (value, expected, path, issues) => {
  if (value !== expected) {
    issues.push({ path, message: `${path} should be ${expected}` })
  }
}

const validateStage = (value, path, issues) => {
  if (!isRecord(value)) {
    issues.push({ path, message: `${path} should be an object` })
    return
  }

  for (const field of stageStringFields) {
    requireString(value[field], `${path}.${field}`, issues)
  }
}

const validateSession = payload => {
  const issues = []

  if (!isRecord(payload)) {
    return [{ path: '$', message: 'session payload should be an object' }]
  }

  requireConst(payload.contract_version, CONTRACT_VERSION, 'contract_version', issues)

  for (const field of sessionStringFields) {
    requireString(payload[field], field, issues)
  }

  validateStage(payload.current_stage, 'current_stage', issues)

  if (!Array.isArray(payload.stages)) {
    issues.push({ path: 'stages', message: 'stages should be an array' })
  } else {
    if (payload.stages.length === 0) {
      issues.push({ path: 'stages', message: 'stages should contain at least one stage' })
    }

    payload.stages.forEach((stage, index) => {
      validateStage(stage, `stages[${index}]`, issues)
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

  if (!Array.isArray(payload.skill_graph)) {
    issues.push({ path: 'skill_graph', message: 'skill_graph should be an array' })
  } else {
    payload.skill_graph.forEach((skill, index) => {
      if (!isRecord(skill)) {
        issues.push({ path: `skill_graph[${index}]`, message: 'skill should be an object' })
        return
      }

      for (const field of skillStringFields) {
        requireString(skill[field], `skill_graph[${index}].${field}`, issues)
      }
    })
  }

  if (!Array.isArray(payload.commands)) {
    issues.push({ path: 'commands', message: 'commands should be an array' })
  } else {
    payload.commands.forEach((command, index) => {
      requireString(command, `commands[${index}]`, issues)
    })
  }

  if (!Array.isArray(payload.events)) {
    issues.push({ path: 'events', message: 'events should be an array' })
  } else {
    payload.events.forEach((event, index) => {
      if (!isRecord(event)) {
        issues.push({ path: `events[${index}]`, message: 'event should be an object' })
        return
      }

      for (const field of eventStringFields) {
        requireString(event[field], `events[${index}].${field}`, issues)
      }
    })
  }

  if (!isRecord(payload.portal)) {
    issues.push({ path: 'portal', message: 'portal should be an object' })
  } else {
    requireConst(payload.portal.framework, PORTAL_FRAMEWORK, 'portal.framework', issues)
    requireConst(payload.portal.repository, PORTAL_REPOSITORY, 'portal.repository', issues)
    requireConst(payload.portal.app_path, PORTAL_APP_PATH, 'portal.app_path', issues)
    requireConst(payload.portal.session_env, PORTAL_SESSION_ENV, 'portal.session_env', issues)
    requireString(payload.portal.dev_command, 'portal.dev_command', issues)
  }

  return issues
}

const sessionPath = process.argv[2] || 'public/session.sample.json'

try {
  const payload = JSON.parse(await readFile(sessionPath, 'utf-8'))
  const issues = validateSession(payload)

  if (issues.length > 0) {
    console.error(`${basename(sessionPath)} is not a valid ${CONTRACT_VERSION}`)
    for (const issue of issues) {
      console.error(`- ${issue.path}: ${issue.message}`)
    }
    process.exitCode = 1
  } else {
    console.log(`${sessionPath} is a valid ${CONTRACT_VERSION} payload`)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'failed to validate session payload')
  process.exitCode = 1
}
