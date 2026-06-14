import type { CatalogSource } from '../application/catalog-loader.ts'

export type CatalogFetchClient = (endpoint: string) => Promise<unknown>

export class HttpCatalogSource implements CatalogSource {
  readonly label: string
  private readonly fetchClient: CatalogFetchClient

  constructor(label: string, fetchClient: CatalogFetchClient) {
    this.label = label
    this.fetchClient = fetchClient
  }

  load(): Promise<unknown> {
    return this.fetchClient(this.label)
  }
}
