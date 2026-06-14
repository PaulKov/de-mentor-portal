import type { SessionSource } from '../application/session-loader'

export type FetchClient = (endpoint: string) => Promise<unknown>

export class HttpSessionSource implements SessionSource {
  constructor(
    public readonly label: string,
    private readonly fetchClient: FetchClient
  ) {}

  load(): Promise<unknown> {
    return this.fetchClient(this.label)
  }
}
