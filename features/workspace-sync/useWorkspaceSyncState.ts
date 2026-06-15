import { computed, onMounted, ref, type Ref } from 'vue'
import type { AcademyCatalog } from '~/core/catalog/domain/academy-catalog'
import type { AcademySession } from '~/core/session/domain/academy-session'
import {
  buildWorkspaceSyncState,
  isAllowedWorkspaceKey,
  parseWorkspaceImport,
  type WorkspaceImportState,
  type WorkspaceRawRecord
} from './workspace-sync-state'

export const useWorkspaceSyncState = (
  catalog: Ref<AcademyCatalog>,
  session: Ref<AcademySession | null | undefined>
) => {
  const records = ref<WorkspaceRawRecord[]>([])
  const importText = ref('')
  const restoreStatus = ref('')
  const syncState = computed(() =>
    buildWorkspaceSyncState({
      catalog: catalog.value,
      session: session.value,
      records: records.value
    })
  )
  const importState = computed<WorkspaceImportState>(() =>
    importText.value.trim()
      ? parseWorkspaceImport(importText.value, catalog.value, records.value)
      : emptyImportState()
  )

  const refreshSnapshot = () => {
    records.value = readWorkspaceRecords()
  }

  const setImportText = (value: string) => {
    importText.value = value
    restoreStatus.value = ''
  }

  const restoreImport = () => {
    if (!importState.value.package || importState.value.readiness === 'blocked') {
      return
    }

    writeWorkspaceRecords(importState.value.package.records)
    restoreStatus.value = 'Workspace restored'
    refreshSnapshot()
  }

  const copyWorkspaceJson = async () => {
    try {
      await navigator.clipboard.writeText(syncState.value.workspaceJson)
    } catch {
      // The readonly textarea remains the manual fallback.
    }
  }

  onMounted(refreshSnapshot)

  return {
    copyWorkspaceJson,
    importState,
    importText,
    refreshSnapshot,
    restoreImport,
    restoreStatus,
    setImportText,
    syncState
  }
}

const readWorkspaceRecords = (): WorkspaceRawRecord[] => {
  const storage = readStorage()
  if (!storage) {
    return []
  }

  return Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => Boolean(key && isAllowedWorkspaceKey(key)))
    .map(key => ({ key, value: parseStoredValue(storage.getItem(key)) }))
    .sort((left, right) => left.key.localeCompare(right.key))
}

const writeWorkspaceRecords = (records: WorkspaceRawRecord[]) => {
  const storage = readStorage()
  if (!storage) {
    return
  }

  for (const record of records) {
    storage.setItem(record.key, serializeRecordValue(record))
  }
}

const parseStoredValue = (raw: string | null) => {
  if (raw === null) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

const serializeRecordValue = (record: WorkspaceRawRecord) =>
  record.key === 'academy-portal-surface' && typeof record.value === 'string'
    ? record.value
    : JSON.stringify(record.value)

const emptyImportState = (): WorkspaceImportState => ({
  readiness: 'blocked',
  issues: [],
  summaryMarkdown: 'Вставь academy-workspace/v1 JSON, чтобы увидеть restore preview.'
})

const readStorage = () =>
  typeof window === 'undefined' ? undefined : window.localStorage
