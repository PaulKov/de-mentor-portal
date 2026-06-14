import { resolve } from 'node:path'
import { JsonFileSessionReader, type SessionFileCandidate } from '../utils/session-file-reader'

export default defineEventHandler(async () => {
  const envCatalog = process.env.ACADEMY_CATALOG
  const candidates: SessionFileCandidate[] = [
    envCatalog ? { path: envCatalog, label: 'ACADEMY_CATALOG' } : undefined,
    { path: resolve(process.cwd(), 'public/catalog.json'), label: 'public/catalog.json' },
    { path: resolve(process.cwd(), 'public/catalog.sample.json'), label: 'public/catalog.sample.json' }
  ].filter(Boolean) as SessionFileCandidate[]

  const result = await new JsonFileSessionReader().readFirst(candidates)

  if (result) {
    return result.payload
  }

  throw createError({
    statusCode: 404,
    statusMessage: 'Academy catalog was not found'
  })
})
