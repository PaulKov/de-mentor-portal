import {
  CONTRACT_VERSION,
  type AcademySession
} from '../../core/session/domain/academy-session.ts'

export interface SessionWorkspaceEntry {
  id: string
  importedAt: string
  sourceName: string
  session: AcademySession
}

export interface SessionWorkspaceSummary {
  id: string
  sourceName: string
  importedAt: string
  studentName: string
  labName: string
  currentStageTitle: string
  stageCount: number
  evidenceCount: number
  lastEventLabel: string
}

export interface SessionWorkspaceState {
  entries: SessionWorkspaceEntry[]
  selectedEntry?: SessionWorkspaceEntry
  summaries: SessionWorkspaceSummary[]
  totalStages: number
  studentCount: number
}

export const createSessionWorkspaceStorageKey = (
  contractVersion = CONTRACT_VERSION
) => ['session-workspace', contractVersion].join(':')

export const createSessionWorkspaceEntry = (
  session: AcademySession,
  sourceName: string,
  importedAt: string
): SessionWorkspaceEntry => ({
  id: [
    session.contract_version,
    session.lab_name,
    session.student_name,
    session.created_at,
    sourceName
  ].map(toIdentityPart).join(':'),
  importedAt,
  sourceName,
  session
})

export const buildSessionWorkspaceState = (
  entries: SessionWorkspaceEntry[],
  selectedEntryId?: string
): SessionWorkspaceState => {
  const sortedEntries = [...entries].sort(compareNewestFirst)
  const selectedEntry =
    sortedEntries.find(entry => entry.id === selectedEntryId) ?? sortedEntries[0]
  const studentCount = new Set(sortedEntries.map(entry => entry.session.student_name)).size

  return {
    entries: sortedEntries,
    selectedEntry,
    summaries: sortedEntries.map(summarizeWorkspaceEntry),
    totalStages: sortedEntries.reduce(
      (total, entry) => total + entry.session.stages.length,
      0
    ),
    studentCount
  }
}

export const summarizeWorkspaceEntry = (
  entry: SessionWorkspaceEntry
): SessionWorkspaceSummary => {
  const lastEvent = entry.session.events.at(-1)

  return {
    id: entry.id,
    sourceName: entry.sourceName,
    importedAt: entry.importedAt,
    studentName: entry.session.student_name,
    labName: entry.session.lab_name,
    currentStageTitle: entry.session.current_stage.title,
    stageCount: entry.session.stages.length,
    evidenceCount: entry.session.skill_graph.length,
    lastEventLabel: lastEvent
      ? `${lastEvent.event_type}: ${lastEvent.note}`
      : 'Событий пока нет'
  }
}

const compareNewestFirst = (
  left: SessionWorkspaceEntry,
  right: SessionWorkspaceEntry
) => right.importedAt.localeCompare(left.importedAt)

const toIdentityPart = (value: string) => {
  const normalized = value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'unknown'
}
