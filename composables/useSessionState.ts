import { SessionLoader } from '~/core/session/application/session-loader'
import type { ValidationIssue } from '~/core/session/application/session-contract'
import type { AcademySession } from '~/core/session/domain/academy-session'
import { HttpSessionSource } from '~/core/session/infrastructure/http-session-source'

const SESSION_ENDPOINTS = ['/api/session', '/session.json', '/session.sample.json']

const createSessionLoader = () =>
  new SessionLoader(
    SESSION_ENDPOINTS.map(endpoint => new HttpSessionSource(endpoint, $fetch))
  )

export async function useSessionState() {
  const session = useState<AcademySession | null>('academy-session', () => null)
  const source = useState<string>('academy-session-source', () => 'not-loaded')
  const issues = useState<ValidationIssue[]>('academy-session-issues', () => [])

  const reload = async () => {
    const result = await createSessionLoader().load()

    if (result.ok) {
      session.value = result.session
      source.value = result.source
      issues.value = []
      return
    }

    session.value = null
    source.value = result.source
    issues.value = result.issues
  }

  if (!session.value && issues.value.length === 0) {
    await reload()
  }

  return {
    session,
    source,
    issues,
    reload,
    isValid: computed(() => session.value !== null && issues.value.length === 0),
    errorMessage: computed(() => issues.value.map(issue => issue.message).join('; '))
  }
}
