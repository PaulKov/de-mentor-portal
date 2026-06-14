import {
  AcademySessionContractValidator,
  type ValidationIssue
} from './session-contract'
import type { AcademySession } from '../domain/academy-session'

export interface SessionSource {
  label: string
  load(): Promise<unknown>
}

export type SessionLoadResult =
  | {
      ok: true
      session: AcademySession
      source: string
      issues: []
    }
  | {
      ok: false
      source: string
      issues: ValidationIssue[]
    }

export class SessionLoader {
  constructor(
    private readonly sources: SessionSource[],
    private readonly validator = new AcademySessionContractValidator()
  ) {}

  async load(): Promise<SessionLoadResult> {
    const collectedIssues: ValidationIssue[] = []

    for (const source of this.sources) {
      try {
        const payload = await source.load()
        const validation = this.validator.validate(payload)

        if (validation.valid && validation.session) {
          return {
            ok: true,
            session: validation.session,
            source: source.label,
            issues: []
          }
        }

        collectedIssues.push(
          ...validation.issues.map(issue => ({
            path: `${source.label}:${issue.path}`,
            message: issue.message
          }))
        )
      } catch (error) {
        collectedIssues.push({
          path: source.label,
          message: error instanceof Error ? error.message : 'failed to load session source'
        })
      }
    }

    return {
      ok: false,
      source: 'not-loaded',
      issues: collectedIssues
    }
  }
}
