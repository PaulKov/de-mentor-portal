import type { AcademyCatalog } from '../../core/catalog/domain/academy-catalog.ts'
import type { AcademySession } from '../../core/session/domain/academy-session.ts'

export const WORKSPACE_CONTRACT_VERSION = 'academy-workspace/v1'

export type WorkspaceRecordGroup = 'portal' | 'catalog' | 'session' | 'delivery' | 'student' | 'review' | 'unknown'
export type WorkspaceRecordStatus = 'ready' | 'warning' | 'blocked'
export type WorkspaceReadiness = 'ready' | 'needs-review' | 'blocked'
export type WorkspaceIssueSeverity = 'blocker' | 'warning'

export interface WorkspaceRawRecord {
  key: string
  value: unknown
}

export interface WorkspaceRecord extends WorkspaceRawRecord {
  group: WorkspaceRecordGroup
  sizeBytes: number
  status: WorkspaceRecordStatus
}

export interface WorkspacePackageSource {
  catalog_version: string
  catalog_generated_at: string
  session_key?: string
}

export interface AcademyWorkspacePackage {
  contract_version: typeof WORKSPACE_CONTRACT_VERSION
  exported_at: string
  source: WorkspacePackageSource
  records: WorkspaceRecord[]
}

export interface WorkspaceGroupSummary {
  group: WorkspaceRecordGroup
  count: number
  sizeBytes: number
}

export interface WorkspaceIssue {
  code: string
  title: string
  detail: string
  severity: WorkspaceIssueSeverity
}

export interface WorkspaceRestoreRecord {
  key: string
  action: 'create' | 'update'
  group: WorkspaceRecordGroup
}

export interface WorkspaceRestorePreview {
  createCount: number
  updateCount: number
  records: WorkspaceRestoreRecord[]
}

export interface WorkspaceSyncInput {
  catalog: AcademyCatalog
  session?: AcademySession | null
  records: WorkspaceRawRecord[]
  exportedAt?: string
}

export interface WorkspaceSyncState {
  package: AcademyWorkspacePackage
  records: WorkspaceRecord[]
  groupSummaries: WorkspaceGroupSummary[]
  readiness: WorkspaceReadiness
  issues: WorkspaceIssue[]
  totalRecords: number
  totalSizeBytes: number
  workspaceJson: string
  prBundleMarkdown: string
}

export interface WorkspaceImportState {
  readiness: WorkspaceReadiness
  issues: WorkspaceIssue[]
  package?: AcademyWorkspacePackage
  preview?: WorkspaceRestorePreview
  summaryMarkdown: string
}

const MAX_RECORD_SIZE_BYTES = 250 * 1024
const ALLOWED_PREFIXES = [
  'academy-portal-surface',
  'academy-lesson-hub:',
  'lesson-launcher:',
  'lesson-authoring-selection:',
  'lesson-authoring:',
  'release-console:',
  'session-workspace:',
  'mentor-cockpit:',
  'delivery-control-room:',
  'evidence-ledger:',
  'student-launchpad:',
  'submission-inbox:',
  'academy-dashboard-mode:'
]

export const buildWorkspaceSyncState = (
  input: WorkspaceSyncInput
): WorkspaceSyncState => {
  const records = normalizeRecords(input.records)
  const workspacePackage: AcademyWorkspacePackage = {
    contract_version: WORKSPACE_CONTRACT_VERSION,
    exported_at: input.exportedAt ?? new Date().toISOString(),
    source: createSource(input.catalog, input.session),
    records
  }
  const issues = createSnapshotIssues(records)
  const readiness = resolveReadiness(issues)
  const groupSummaries = summarizeGroups(records)
  const workspaceJson = JSON.stringify(workspacePackage, null, 2)

  return {
    package: workspacePackage,
    records,
    groupSummaries,
    readiness,
    issues,
    totalRecords: records.length,
    totalSizeBytes: records.reduce((sum, record) => sum + record.sizeBytes, 0),
    workspaceJson,
    prBundleMarkdown: createBundleMarkdown(workspacePackage, groupSummaries, issues)
  }
}

export const parseWorkspaceImport = (
  packageText: string,
  catalog: AcademyCatalog,
  currentRecords: WorkspaceRawRecord[]
): WorkspaceImportState => {
  const parsed = parseJson(packageText)
  if (!parsed.ok) {
    return blockedImport('invalid-json', 'Package не JSON', 'Проверь import textarea.')
  }
  const baseIssues = validatePackageShape(parsed.value, catalog)
  const workspacePackage = normalizePackage(parsed.value)
  if (!workspacePackage) {
    return {
      readiness: 'blocked',
      issues: baseIssues,
      summaryMarkdown: createImportMarkdown(undefined, baseIssues)
    }
  }

  const issues = [...baseIssues, ...createImportWarnings(workspacePackage, catalog, currentRecords)]
  const preview = createRestorePreview(workspacePackage.records, currentRecords)

  return {
    readiness: resolveReadiness(issues),
    issues,
    package: workspacePackage,
    preview,
    summaryMarkdown: createImportMarkdown(workspacePackage, issues, preview)
  }
}

export const isAllowedWorkspaceKey = (key: string) =>
  ALLOWED_PREFIXES.some(prefix => key === prefix || key.startsWith(prefix))

export const classifyWorkspaceKey = (key: string): WorkspaceRecordGroup => {
  if (key === 'academy-portal-surface') return 'portal'
  if (key.startsWith('session-workspace:')) return 'session'
  if (
    key.startsWith('mentor-cockpit:') ||
    key.startsWith('delivery-control-room:') ||
    key.startsWith('evidence-ledger:')
  ) return 'delivery'
  if (key.startsWith('student-launchpad:') || key.startsWith('submission-inbox:')) return 'student'
  if (key.startsWith('academy-dashboard-mode:')) return 'review'
  if (
    key.startsWith('academy-lesson-hub:') ||
    key.startsWith('lesson-launcher:') ||
    key.startsWith('lesson-authoring-selection:') ||
    key.startsWith('lesson-authoring:') ||
    key.startsWith('release-console:')
  ) return 'catalog'
  return 'unknown'
}

const normalizeRecords = (records: WorkspaceRawRecord[]): WorkspaceRecord[] =>
  records
    .filter(record => typeof record.key === 'string' && isAllowedWorkspaceKey(record.key))
    .map(record => {
      const sizeBytes = calculateSize(record.value)
      return {
        key: record.key,
        value: record.value,
        group: classifyWorkspaceKey(record.key),
        sizeBytes,
        status: sizeBytes > MAX_RECORD_SIZE_BYTES || record.value === null ? 'warning' : 'ready'
      }
    })
    .sort((left, right) => left.key.localeCompare(right.key))

const normalizePackage = (value: unknown): AcademyWorkspacePackage | null => {
  if (!isRecord(value) || value.contract_version !== WORKSPACE_CONTRACT_VERSION || !Array.isArray(value.records)) {
    return null
  }

  return {
    contract_version: WORKSPACE_CONTRACT_VERSION,
    exported_at: typeof value.exported_at === 'string' ? value.exported_at : '',
    source: normalizeSource(value.source),
    records: value.records.map(normalizeImportedRecord).filter(Boolean) as WorkspaceRecord[]
  }
}

const normalizeImportedRecord = (value: unknown): WorkspaceRecord | null => {
  if (!isRecord(value) || typeof value.key !== 'string') {
    return null
  }
  const sizeBytes = typeof value.sizeBytes === 'number' ? value.sizeBytes : calculateSize(value.value)

  return {
    key: value.key,
    value: value.value,
    group: classifyWorkspaceKey(value.key),
    sizeBytes,
    status: sizeBytes > MAX_RECORD_SIZE_BYTES || value.value === null ? 'warning' : 'ready'
  }
}

const validatePackageShape = (value: unknown, catalog: AcademyCatalog): WorkspaceIssue[] => {
  if (!isRecord(value)) {
    return [issue('invalid-package', 'Package не объект', 'Импорт должен быть JSON object.', 'blocker')]
  }
  const issues = [
    ...condition(value.contract_version !== WORKSPACE_CONTRACT_VERSION, 'bad-version', 'Неверный contract_version', `Ожидается ${WORKSPACE_CONTRACT_VERSION}.`, 'blocker'),
    ...condition(!Array.isArray(value.records), 'missing-records', 'Records отсутствуют', 'Поле records должно быть массивом.', 'blocker')
  ]

  if (Array.isArray(value.records)) {
    for (const record of value.records) {
      if (!isRecord(record) || typeof record.key !== 'string') {
        issues.push(issue('record-key', 'Record без key', 'Каждая запись должна иметь строковый key.', 'blocker'))
      } else if (!isAllowedWorkspaceKey(record.key)) {
        issues.push(issue('disallowed-key', 'Key вне portal scope', record.key, 'blocker'))
      }
    }
  }

  if (isRecord(value.source) && value.source.catalog_generated_at !== catalog.generated_at) {
    issues.push(issue('catalog-mismatch', 'Catalog metadata отличается', 'Проверь, что package относится к текущему catalog.', 'warning'))
  }

  return issues
}

const createImportWarnings = (
  workspacePackage: AcademyWorkspacePackage,
  _catalog: AcademyCatalog,
  currentRecords: WorkspaceRawRecord[]
): WorkspaceIssue[] => {
  const currentKeys = new Set(currentRecords.map(record => record.key))
  return [
    ...condition(workspacePackage.records.length === 0, 'empty-package', 'Package пустой', 'Restore ничего не изменит.', 'warning'),
    ...workspacePackage.records.flatMap(record => [
      ...condition(record.value === null, 'null-record', 'Record value равен null', record.key, 'warning'),
      ...condition(record.sizeBytes > MAX_RECORD_SIZE_BYTES, 'large-record', 'Record больше 250 KB', record.key, 'warning'),
      ...condition(!currentKeys.has(record.key), 'new-key', 'Import содержит новый key', record.key, 'warning')
    ])
  ]
}

const createSnapshotIssues = (records: WorkspaceRecord[]) => [
  ...condition(records.length === 0, 'empty-snapshot', 'Snapshot пустой', 'В localStorage пока нет portal-owned записей.', 'warning'),
  ...records.flatMap(record => [
    ...condition(record.value === null, 'null-record', 'Record value равен null', record.key, 'warning'),
    ...condition(record.sizeBytes > MAX_RECORD_SIZE_BYTES, 'large-record', 'Record больше 250 KB', record.key, 'warning')
  ])
]

const createRestorePreview = (
  records: WorkspaceRecord[],
  currentRecords: WorkspaceRawRecord[]
): WorkspaceRestorePreview => {
  const currentKeys = new Set(currentRecords.map(record => record.key))
  const previewRecords = records.map(record => ({
    key: record.key,
    group: record.group,
    action: currentKeys.has(record.key) ? 'update' as const : 'create' as const
  }))

  return {
    createCount: previewRecords.filter(record => record.action === 'create').length,
    updateCount: previewRecords.filter(record => record.action === 'update').length,
    records: previewRecords
  }
}

const createSource = (
  catalog: AcademyCatalog,
  session?: AcademySession | null
): WorkspacePackageSource => ({
  catalog_version: catalog.contract_version,
  catalog_generated_at: catalog.generated_at,
  ...(session ? { session_key: [session.contract_version, session.lab_name, session.student_name, session.created_at].join(':') } : {})
})

const summarizeGroups = (records: WorkspaceRecord[]): WorkspaceGroupSummary[] =>
  Array.from(new Set(records.map(record => record.group))).sort().map(group => ({
    group,
    count: records.filter(record => record.group === group).length,
    sizeBytes: records
      .filter(record => record.group === group)
      .reduce((sum, record) => sum + record.sizeBytes, 0)
  }))

const createBundleMarkdown = (
  workspacePackage: AcademyWorkspacePackage,
  groups: WorkspaceGroupSummary[],
  issues: WorkspaceIssue[]
) => [
  '# Workspace Sync Bundle',
  '',
  `Contract: ${workspacePackage.contract_version}`,
  `Exported at: ${workspacePackage.exported_at}`,
  `Records: ${workspacePackage.records.length}`,
  '',
  '## Groups',
  ...groups.map(group => `- ${group.group}: ${group.count} records, ${group.sizeBytes} bytes`),
  '',
  '## Issues',
  ...listIssues(issues)
].join('\n')

const createImportMarkdown = (
  workspacePackage: AcademyWorkspacePackage | undefined,
  issues: WorkspaceIssue[],
  preview?: WorkspaceRestorePreview
) => [
  '# Workspace Import Summary',
  '',
  `Records: ${workspacePackage?.records.length ?? 0}`,
  `Restore preview: create: ${preview?.createCount ?? 0}, update: ${preview?.updateCount ?? 0}`,
  '',
  '## Issues',
  ...listIssues(issues)
].join('\n')

const resolveReadiness = (issues: WorkspaceIssue[]): WorkspaceReadiness => {
  if (issues.some(item => item.severity === 'blocker')) return 'blocked'
  return issues.some(item => item.severity === 'warning') ? 'needs-review' : 'ready'
}

const parseJson = (value: string): { ok: true; value: unknown } | { ok: false } => {
  try {
    return { ok: true, value: JSON.parse(value) }
  } catch {
    return { ok: false }
  }
}

const blockedImport = (code: string, title: string, detail: string): WorkspaceImportState => ({
  readiness: 'blocked',
  issues: [issue(code, title, detail, 'blocker')],
  summaryMarkdown: ['# Workspace Import Summary', '', `- ${title}: ${detail}`].join('\n')
})

const calculateSize = (value: unknown) =>
  JSON.stringify(value)?.length ?? 0

const normalizeSource = (value: unknown): WorkspacePackageSource =>
  isRecord(value)
    ? {
        catalog_version: typeof value.catalog_version === 'string' ? value.catalog_version : '',
        catalog_generated_at: typeof value.catalog_generated_at === 'string' ? value.catalog_generated_at : '',
        ...(typeof value.session_key === 'string' ? { session_key: value.session_key } : {})
      }
    : { catalog_version: '', catalog_generated_at: '' }

const condition = (
  flag: boolean,
  code: string,
  title: string,
  detail: string,
  severity: WorkspaceIssueSeverity
) => flag ? [issue(code, title, detail, severity)] : []

const issue = (
  code: string,
  title: string,
  detail: string,
  severity: WorkspaceIssueSeverity
): WorkspaceIssue => ({ code, title, detail, severity })

const listIssues = (issues: WorkspaceIssue[]) =>
  issues.length
    ? issues.map(item => `- ${item.severity}: ${item.title} — ${item.detail}`)
    : ['- Нет']

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
