export interface JsonStoragePort {
  get<T>(key: string): T | null
  set<T>(key: string, value: T): void
  remove(key: string): void
}

export interface BrowserStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const createSafeLocalStoragePort = (
  storage?: BrowserStorageLike
): JsonStoragePort => ({
  get<T>(key: string): T | null {
    if (!storage) {
      return null
    }

    try {
      const raw = storage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  },

  set<T>(key: string, value: T): void {
    if (!storage) {
      return
    }

    try {
      storage.setItem(key, JSON.stringify(value))
    } catch {
      // Local browser storage is a convenience, not a delivery blocker.
    }
  },

  remove(key: string): void {
    if (!storage) {
      return
    }

    try {
      storage.removeItem(key)
    } catch {
      // Local browser storage is a convenience, not a delivery blocker.
    }
  }
})
