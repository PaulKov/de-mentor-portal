import { readFile } from 'node:fs/promises'

export interface SessionFileCandidate {
  path: string
  label: string
}

export interface SessionFileReadResult {
  label: string
  payload: unknown
}

export class JsonFileSessionReader {
  async readFirst(candidates: SessionFileCandidate[]): Promise<SessionFileReadResult | null> {
    for (const candidate of candidates) {
      try {
        const raw = await readFile(candidate.path, 'utf-8')
        return {
          label: candidate.label,
          payload: JSON.parse(raw)
        }
      } catch {
        continue
      }
    }

    return null
  }
}
