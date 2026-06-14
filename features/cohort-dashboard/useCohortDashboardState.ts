import { computed, onMounted, ref, watch, type Ref } from 'vue'
import type { AcademySession } from '~/core/session/domain/academy-session'
import { createMentorStorageKey } from '~/features/mentor-cockpit/mentor-cockpit-state'
import {
  createSessionWorkspaceStorageKey,
  type SessionWorkspaceEntry
} from '~/features/session-workspace/session-workspace-state'
import { createSubmissionStorageKey } from '~/features/submission-inbox/submission-inbox-state'
import { createSafeLocalStoragePort } from '~/shared/utils/local-storage'
import {
  buildCohortDashboardState,
  normalizeCohortFilters,
  type CohortFilterStatus,
  type CohortFilters,
  type CohortSessionSource,
  type CohortStorageSnapshots
} from './cohort-dashboard-state'

interface WorkspaceStore {
  entries?: unknown
}

export const useCohortDashboardState = (
  session: Ref<AcademySession>,
  source: Ref<string>
) => {
  const filters = ref<CohortFilters>(normalizeCohortFilters())
  const workspaceEntries = ref<SessionWorkspaceEntry[]>([])
  const snapshots = ref<CohortStorageSnapshots>({})
  const cohortSources = computed(() => createCohortSources(
    session.value,
    source.value,
    workspaceEntries.value
  ))
  const cohortState = computed(() =>
    buildCohortDashboardState(cohortSources.value, snapshots.value, filters.value)
  )

  const hydrate = () => {
    const storagePort = createBrowserStoragePort()
    workspaceEntries.value = readWorkspaceEntries(storagePort.get(
      createSessionWorkspaceStorageKey()
    ))
    snapshots.value = readSnapshots(cohortSources.value)
  }

  const selectStatusFilter = (status: CohortFilterStatus) => {
    filters.value = normalizeCohortFilters({ status })
  }

  onMounted(hydrate)

  watch(session, hydrate)

  return {
    cohortState,
    hydrate,
    selectStatusFilter
  }
}

const createCohortSources = (
  session: AcademySession,
  source: string,
  workspaceEntries: SessionWorkspaceEntry[]
): CohortSessionSource[] => [
  { session, source },
  ...workspaceEntries.map(entry => ({
    session: entry.session,
    source: `workspace:${entry.sourceName}`,
    importedAt: entry.importedAt
  }))
]

const readWorkspaceEntries = (value: unknown): SessionWorkspaceEntry[] => {
  const store = value as WorkspaceStore | null

  return Array.isArray(store?.entries)
    ? store.entries.filter(isWorkspaceEntry)
    : []
}

const readSnapshots = (
  sources: CohortSessionSource[]
): CohortStorageSnapshots => {
  const storagePort = createBrowserStoragePort()
  const mentorStates: Record<string, unknown> = {}
  const submissionStates: Record<string, unknown> = {}

  for (const source of sources) {
    const mentorKey = createMentorStorageKey(source.session)
    const submissionKey = createSubmissionStorageKey(source.session)
    mentorStates[mentorKey] = storagePort.get(mentorKey)
    submissionStates[submissionKey] = storagePort.get(submissionKey)
  }

  return { mentorStates, submissionStates }
}

const isWorkspaceEntry = (value: unknown): value is SessionWorkspaceEntry =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  typeof (value as SessionWorkspaceEntry).id === 'string' &&
  typeof (value as SessionWorkspaceEntry).sourceName === 'string' &&
  typeof (value as SessionWorkspaceEntry).importedAt === 'string' &&
  typeof (value as SessionWorkspaceEntry).session === 'object'

const createBrowserStoragePort = () =>
  createSafeLocalStoragePort(
    typeof window === 'undefined' ? undefined : window.localStorage
  )
