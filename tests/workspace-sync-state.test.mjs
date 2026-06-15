import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadCatalog = async () => JSON.parse(await readFile('public/catalog.sample.json', 'utf-8'))
const loadSession = async () => JSON.parse(await readFile('public/session.sample.json', 'utf-8'))

test('buildWorkspaceSyncState exports only portal-owned records by group', async () => {
  const { buildWorkspaceSyncState, WORKSPACE_CONTRACT_VERSION } =
    await import('../features/workspace-sync/workspace-sync-state.ts')
  const catalog = await loadCatalog()
  const session = await loadSession()

  const state = buildWorkspaceSyncState({
    catalog,
    session,
    records: [
      { key: 'academy-portal-surface', value: 'authoring' },
      { key: 'lesson-authoring:academy-catalog/v1:2026:greenplum:01', value: { draft: true } },
      { key: 'mentor-cockpit:academy-session/v1:lab:student:created', value: { checkedEvidence: ['x'] } },
      { key: 'not-owned', value: { secret: true } }
    ],
    exportedAt: '2026-06-15T18:00:00Z'
  })

  assert.equal(state.package.contract_version, WORKSPACE_CONTRACT_VERSION)
  assert.equal(state.package.records.length, 3)
  assert.equal(state.package.records.some(record => record.key === 'not-owned'), false)
  assert.equal(state.groupSummaries.find(group => group.group === 'catalog')?.count, 1)
  assert.equal(state.groupSummaries.find(group => group.group === 'delivery')?.count, 1)
  assert.match(state.workspaceJson, /academy-workspace\/v1/)
  assert.match(state.prBundleMarkdown, /Workspace Sync Bundle/)
})

test('parseWorkspaceImport validates bad json, bad version and unknown keys', async () => {
  const {
    parseWorkspaceImport,
    WORKSPACE_CONTRACT_VERSION
  } = await import('../features/workspace-sync/workspace-sync-state.ts')
  const catalog = await loadCatalog()

  assert.equal(parseWorkspaceImport('{bad', catalog, []).readiness, 'blocked')
  assert.equal(parseWorkspaceImport(JSON.stringify({ contract_version: 'bad', records: [] }), catalog, []).readiness, 'blocked')

  const parsed = parseWorkspaceImport(JSON.stringify({
    contract_version: WORKSPACE_CONTRACT_VERSION,
    exported_at: '2026-06-15T18:00:00Z',
    source: {
      catalog_version: catalog.contract_version,
      catalog_generated_at: catalog.generated_at
    },
    records: [{ key: 'unknown-key', group: 'unknown', value: {}, sizeBytes: 2, status: 'ready' }]
  }), catalog, [])

  assert.equal(parsed.readiness, 'blocked')
  assert.ok(parsed.issues.some(issue => issue.severity === 'blocker'))
})

test('parseWorkspaceImport previews create and update restore actions', async () => {
  const {
    parseWorkspaceImport,
    WORKSPACE_CONTRACT_VERSION
  } = await import('../features/workspace-sync/workspace-sync-state.ts')
  const catalog = await loadCatalog()
  const packageText = JSON.stringify({
    contract_version: WORKSPACE_CONTRACT_VERSION,
    exported_at: '2026-06-15T18:00:00Z',
    source: {
      catalog_version: catalog.contract_version,
      catalog_generated_at: catalog.generated_at
    },
    records: [
      { key: 'academy-portal-surface', group: 'portal', value: 'sync', sizeBytes: 6, status: 'ready' },
      { key: 'submission-inbox:academy-session/v1:lab:student:created', group: 'student', value: { status: 'ready' }, sizeBytes: 18, status: 'ready' }
    ]
  })

  const parsed = parseWorkspaceImport(packageText, catalog, [
    { key: 'academy-portal-surface', value: 'hub' }
  ])

  assert.equal(parsed.readiness, 'needs-review')
  assert.equal(parsed.preview?.createCount, 1)
  assert.equal(parsed.preview?.updateCount, 1)
  assert.equal(parsed.preview?.records.length, 2)
  assert.match(parsed.summaryMarkdown, /create: 1/)
})
