import { computed, onMounted, ref } from 'vue'
import {
  AcademySessionContractValidator,
  type ValidationIssue
} from '../../core/session/application/session-contract.ts'
import type { AcademySession } from '../../core/session/domain/academy-session.ts'
import {
  createSafeLocalStoragePort,
  type BrowserStorageLike,
  type JsonStoragePort
} from '../../shared/utils/local-storage.ts'
import {
  buildSessionWorkspaceState,
  createSessionWorkspaceEntry,
  createSessionWorkspaceStorageKey,
  type SessionWorkspaceEntry
} from './session-workspace-state.ts'

interface SessionWorkspaceStore {
  entries: SessionWorkspaceEntry[]
  selectedEntryId?: string
}

export interface SessionWorkspaceDependencies {
  storage?: BrowserStorageLike
  validator?: AcademySessionContractValidator
  now?: () => string
}

const emptyStore = (): SessionWorkspaceStore => ({
  entries: [],
  selectedEntryId: undefined
})

export const useSessionWorkspaceState = (
  dependencies: SessionWorkspaceDependencies = {}
) => {
  const validator = dependencies.validator ?? new AcademySessionContractValidator()
  const now = dependencies.now ?? (() => new Date().toISOString())
  const storageKey = createSessionWorkspaceStorageKey()
  let storage: JsonStoragePort = createSafeLocalStoragePort(dependencies.storage)

  const entries = ref<SessionWorkspaceEntry[]>([])
  const selectedEntryId = ref<string>()
  const importIssues = ref<ValidationIssue[]>([])
  const importError = ref('')

  const workspaceState = computed(() =>
    buildSessionWorkspaceState(entries.value, selectedEntryId.value)
  )

  const hydrate = () => {
    const stored = storage.get<SessionWorkspaceStore>(storageKey) ?? emptyStore()
    entries.value = Array.isArray(stored.entries) ? stored.entries : []
    selectedEntryId.value = stored.selectedEntryId
  }

  const persist = () => {
    storage.set(storageKey, {
      entries: entries.value,
      selectedEntryId: selectedEntryId.value
    })
  }

  const registerSession = (
    session: AcademySession,
    sourceName: string,
    importedAt = now()
  ) => {
    const entry = createSessionWorkspaceEntry(session, sourceName, importedAt)
    entries.value = [
      entry,
      ...entries.value.filter(existing => existing.id !== entry.id)
    ]
    selectedEntryId.value = entry.id
    importIssues.value = []
    importError.value = ''
    persist()
    return entry
  }

  const importSessionFile = async (file: File) => {
    try {
      const payload = JSON.parse(await file.text())
      const result = validator.validate(payload)
      if (!result.valid || !result.session) {
        importIssues.value = result.issues
        importError.value = 'Файл не прошел academy-session/v1 validation.'
        return false
      }

      registerSession(result.session, file.name)
      return true
    } catch (error) {
      importIssues.value = []
      importError.value = error instanceof Error
        ? `Не удалось прочитать JSON: ${error.message}`
        : 'Не удалось прочитать JSON.'
      return false
    }
  }

  const selectEntry = (entryId: string) => {
    selectedEntryId.value = entryId
    persist()
  }

  const removeEntry = (entryId: string) => {
    entries.value = entries.value.filter(entry => entry.id !== entryId)
    if (selectedEntryId.value === entryId) {
      selectedEntryId.value = entries.value[0]?.id
    }
    persist()
  }

  onMounted(() => {
    if (!dependencies.storage && typeof window !== 'undefined') {
      storage = createSafeLocalStoragePort(window.localStorage)
    }
    hydrate()
  })

  if (dependencies.storage) {
    hydrate()
  }

  return {
    importError,
    importIssues,
    importSessionFile,
    registerSession,
    removeEntry,
    selectEntry,
    workspaceState
  }
}
