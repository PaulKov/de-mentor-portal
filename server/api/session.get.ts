import { resolve } from 'node:path'
import { JsonFileSessionReader, type SessionFileCandidate } from '../utils/session-file-reader'

export default defineEventHandler(async () => {
  const envSession = process.env.MENTOR_LAB_SESSION
  const candidates: SessionFileCandidate[] = [
    envSession ? { path: envSession, label: 'MENTOR_LAB_SESSION' } : undefined,
    { path: resolve(process.cwd(), 'public/session.json'), label: 'public/session.json' },
    { path: resolve(process.cwd(), 'public/session.sample.json'), label: 'public/session.sample.json' }
  ].filter(Boolean) as SessionFileCandidate[]

  const result = await new JsonFileSessionReader().readFirst(candidates)

  if (result) {
    return result.payload
  }

  throw createError({
    statusCode: 404,
    statusMessage: 'Session state was not found'
  })
})
