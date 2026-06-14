import {
  AcademyCatalogContractValidator,
  type CatalogValidationIssue
} from './catalog-contract.ts'
import type { AcademyCatalog } from '../domain/academy-catalog.ts'

export interface CatalogSource {
  label: string
  load(): Promise<unknown>
}

export type CatalogLoadResult =
  | {
      ok: true
      catalog: AcademyCatalog
      source: string
      issues: []
    }
  | {
      ok: false
      source: string
      issues: CatalogValidationIssue[]
    }

export class CatalogLoader {
  private readonly sources: CatalogSource[]
  private readonly validator: AcademyCatalogContractValidator

  constructor(sources: CatalogSource[], validator = new AcademyCatalogContractValidator()) {
    this.sources = sources
    this.validator = validator
  }

  async load(): Promise<CatalogLoadResult> {
    const collectedIssues: CatalogValidationIssue[] = []

    for (const source of this.sources) {
      try {
        const payload = await source.load()
        const validation = this.validator.validate(payload)

        if (validation.valid && validation.catalog) {
          return {
            ok: true,
            catalog: validation.catalog,
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
          message: error instanceof Error ? error.message : 'failed to load catalog source'
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
