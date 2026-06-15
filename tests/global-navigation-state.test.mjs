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
    ['hub', 'authoring', 'mission-control', 'release', 'workspace', 'session', 'review', 'assessment', 'submission', 'cohort', 'post-lesson']
  )
  assert.equal(state.context.primaryLabel, 'Demo Student · greenplum-partitioning')
  assert.equal(state.context.catalogStatus, 'ready')
  assert.equal(state.context.sessionStatus, 'ready')
  assert.ok(state.items.every(item => item.isEnabled), 'all surfaces should be reachable with valid catalog/session')

  const commands = state.commandGroups.flatMap(group => group.commands)
  assert.ok(commands.some(command =>
    command.id === 'open-authoring' &&
    command.label === 'Открыть Lesson Authoring Studio' &&
    command.surface === 'authoring'
  ))
  assert.ok(commands.some(command =>
    command.id === 'open-mission-control' &&
    command.label === 'Открыть Mentor Mission Control' &&
    command.surface === 'mission-control'
  ))
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
    command.id === 'open-post-lesson' &&
    command.label === 'Открыть Post-Lesson Pack' &&
    command.surface === 'post-lesson'
  ))
  assert.ok(commands.some(command =>
    command.id === 'open-assessment' &&
    command.label === 'Открыть Skill Assessment Center' &&
    command.surface === 'assessment'
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
  assert.equal(state.items.find(item => item.surface === 'authoring')?.isEnabled, true)
  assert.equal(state.items.find(item => item.surface === 'mission-control')?.isEnabled, false)
  assert.equal(state.items.find(item => item.surface === 'review')?.isEnabled, false)
  assert.equal(state.items.find(item => item.surface === 'assessment')?.isEnabled, false)
  assert.equal(state.items.find(item => item.surface === 'submission')?.isEnabled, false)
  assert.equal(state.items.find(item => item.surface === 'cohort')?.isEnabled, false)
  assert.equal(state.items.find(item => item.surface === 'post-lesson')?.isEnabled, false)
  assert.match(
    state.items.find(item => item.surface === 'review')?.disabledReason ?? '',
    /валидная session/i
  )
  assert.equal(
    state.commandGroups.flatMap(group => group.commands).find(command => command.id === 'open-mission-control')?.isEnabled,
    false
  )
  assert.equal(
    state.commandGroups.flatMap(group => group.commands).find(command => command.id === 'open-review')?.isEnabled,
    false
  )
  assert.equal(
    state.commandGroups.flatMap(group => group.commands).find(command => command.id === 'open-assessment')?.isEnabled,
    false
  )
})

test('normalizePortalSurface accepts only known portal surfaces', async () => {
  const {
    normalizePortalSurface
  } = await import('../features/global-navigation/global-navigation-state.ts')

  assert.equal(normalizePortalSurface('cohort'), 'cohort')
  assert.equal(normalizePortalSurface('authoring'), 'authoring')
  assert.equal(normalizePortalSurface('mission-control'), 'mission-control')
  assert.equal(normalizePortalSurface('assessment'), 'assessment')
  assert.equal(normalizePortalSurface('post-lesson'), 'post-lesson')
  assert.equal(normalizePortalSurface('release'), 'release')
  assert.equal(normalizePortalSurface('broken'), 'hub')
  assert.equal(normalizePortalSurface(null), 'hub')
  assert.equal(normalizePortalSurface(undefined), 'hub')
})
