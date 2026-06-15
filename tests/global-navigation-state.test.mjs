import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loadCatalog = async () => JSON.parse(await readFile('public/catalog.sample.json', 'utf-8'))
const loadSession = async () => JSON.parse(await readFile('public/session.sample.json', 'utf-8'))

test('buildGlobalNavigationState exposes all portal surfaces and session context', async () => {
  const {
    buildGlobalNavigationState
  } = await import('../features/global-navigation/global-navigation-state.ts')

  const state = buildGlobalNavigationState({
    catalog: await loadCatalog(),
    catalogSource: '/api/catalog',
    catalogIsValid: true,
    session: await loadSession(),
    sessionSource: '/api/session',
    sessionIsValid: true,
    activeSurface: 'session',
    ledgerReportMarkdown: '# Lesson Run Ledger: Demo Student'
  })

  assert.equal(state.activeSurface, 'session')
  assert.deepEqual(
    state.items.map(item => item.surface),
    ['hub', 'release', 'workspace', 'session', 'review', 'submission', 'cohort']
  )
  assert.equal(state.context.primaryLabel, 'Demo Student · greenplum-partitioning')
  assert.equal(state.context.catalogStatus, 'ready')
  assert.equal(state.context.sessionStatus, 'ready')
  assert.ok(state.items.every(item => item.isEnabled), 'all surfaces should be reachable with valid catalog/session')

  const commands = state.commandGroups.flatMap(group => group.commands)
  assert.ok(commands.some(command =>
    command.id === 'open-release' &&
    command.kind === 'navigate' &&
    command.surface === 'release' &&
    command.isEnabled
  ))
  assert.ok(commands.some(command =>
    command.id === 'open-session' &&
    command.label === 'Открыть Mentor Live Cockpit' &&
    command.surface === 'session'
  ))
  assert.ok(commands.some(command =>
    command.id === 'copy-portal-start' &&
    command.kind === 'copy' &&
    command.value.includes('mentor-lab.py portal greenplum start')
  ))
  assert.ok(commands.some(command =>
    command.id === 'copy-release-verify' &&
    command.kind === 'copy' &&
    command.value === 'python3 mentor-lab.py lesson-release greenplum-partitioning verify'
  ))
  assert.ok(commands.some(command =>
    command.id === 'copy-current-stage-command' &&
    command.kind === 'copy' &&
    command.value === 'python3 mentor-lab.py runbook greenplum-partitioning simple'
  ))
  assert.ok(commands.some(command =>
    command.id === 'copy-current-stage-question' &&
    command.kind === 'copy' &&
    command.value.includes('Почему partition key')
  ))
  assert.ok(commands.some(command =>
    command.id === 'copy-ledger-report' &&
    command.kind === 'copy' &&
    command.label === 'Скопировать ledger report' &&
    command.value === '# Lesson Run Ledger: Demo Student'
  ))
})

test('buildGlobalNavigationState disables evidence surfaces without a valid session', async () => {
  const {
    buildGlobalNavigationState
  } = await import('../features/global-navigation/global-navigation-state.ts')

  const state = buildGlobalNavigationState({
    catalog: await loadCatalog(),
    catalogSource: '/api/catalog',
    catalogIsValid: true,
    session: null,
    sessionSource: '/api/session',
    sessionIsValid: false,
    activeSurface: 'review'
  })

  assert.equal(state.activeSurface, 'session')
  assert.equal(state.context.primaryLabel, 'Сессия не загружена')
  assert.equal(state.context.sessionStatus, 'error')
  assert.equal(state.items.find(item => item.surface === 'session')?.isEnabled, true)
  assert.equal(state.items.find(item => item.surface === 'review')?.isEnabled, false)
  assert.equal(state.items.find(item => item.surface === 'submission')?.isEnabled, false)
  assert.equal(state.items.find(item => item.surface === 'cohort')?.isEnabled, false)
  assert.match(
    state.items.find(item => item.surface === 'review')?.disabledReason ?? '',
    /валидная session/i
  )
  assert.equal(
    state.commandGroups.flatMap(group => group.commands).find(command => command.id === 'open-review')?.isEnabled,
    false
  )
})

test('normalizePortalSurface accepts only known portal surfaces', async () => {
  const {
    normalizePortalSurface
  } = await import('../features/global-navigation/global-navigation-state.ts')

  assert.equal(normalizePortalSurface('cohort'), 'cohort')
  assert.equal(normalizePortalSurface('release'), 'release')
  assert.equal(normalizePortalSurface('broken'), 'hub')
  assert.equal(normalizePortalSurface(null), 'hub')
  assert.equal(normalizePortalSurface(undefined), 'hub')
})
