import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const readText = path => readFile(path, 'utf-8')
const lineCount = text => text.split('\n').length

const assertFileExists = path => {
  assert.ok(existsSync(path), `${path} should exist`)
}

test('portal keeps a clean feature-oriented architecture taxonomy', async () => {
  const expectedFiles = [
    'core/session/domain/academy-session.ts',
    'core/session/domain/control-plane.ts',
    'core/session/application/session-contract.ts',
    'core/session/application/session-loader.ts',
    'core/session/infrastructure/http-session-source.ts',
    'features/session-dashboard/SessionDashboard.vue',
    'features/session-status/SessionStatusBanner.vue',
    'features/timeline/SessionTimeline.vue',
    'features/commands/CommandList.vue',
    'features/evidence/EvidenceChecklist.vue',
    'features/control-plane/ControlPlanePanel.vue',
    'features/skill-graph/SkillGraphPanel.vue',
    'components/shared/ui/AppShell.vue',
    'components/shared/ui/Panel.vue',
    'components/shared/ui/CopyCommand.vue',
    'components/shared/ui/StatusBadge.vue',
    'shared/utils/clipboard.ts'
  ]

  for (const path of expectedFiles) {
    assertFileExists(path)
  }

  const app = await readText('app.vue')
  assert.ok(app.includes('<SessionDashboard'), 'app.vue should delegate rendering to SessionDashboard')
  assert.ok(lineCount(app) <= 35, 'app.vue should stay a thin Nuxt facade')

  const composable = await readText('composables/useSessionState.ts')
  assert.ok(composable.includes('SessionLoader'), 'session composable should depend on the application loader')
  assert.ok(composable.includes('HttpSessionSource'), 'session composable should inject HTTP session sources')
  assert.ok(lineCount(composable) <= 85, 'useSessionState should stay a thin state facade')
})

test('session core exposes typed contracts, validation and DI seams', async () => {
  const domain = await readText('core/session/domain/academy-session.ts')
  const controlPlaneDomain = await readText('core/session/domain/control-plane.ts')
  const contract = await readText('core/session/application/session-contract.ts')
  const loader = await readText('core/session/application/session-loader.ts')
  const httpSource = await readText('core/session/infrastructure/http-session-source.ts')

  for (const marker of [
    'export interface AcademySession',
    'export interface AcademyStage',
    'export interface SkillNode',
    'export interface SessionEvent',
    'CONTRACT_VERSION',
    'PORTAL_FRAMEWORK',
    'PORTAL_REPOSITORY'
  ]) {
    assert.ok(domain.includes(marker), `domain should expose ${marker}`)
  }

  assert.ok(contract.includes('class AcademySessionContractValidator'))
  assert.ok(contract.includes('validate(payload: unknown)'))
  assert.ok(contract.includes('ValidationResult'))
  assert.ok(contract.includes('CONTRACT_VERSION'))
  assert.ok(contract.includes('validateControlPlane'))
  assert.ok(contract.includes('CONTROL_PLANE_VERSION'))

  for (const marker of [
    'export interface AcademyControlPlane',
    'export interface StageGuide',
    'export interface PortalActions',
    'CONTROL_PLANE_VERSION'
  ]) {
    assert.ok(controlPlaneDomain.includes(marker), `control plane domain should expose ${marker}`)
  }

  assert.ok(loader.includes('export interface SessionSource'))
  assert.ok(loader.includes('class SessionLoader'))
  assert.ok(loader.includes('constructor('), 'SessionLoader should receive dependencies through constructor DI')
  assert.ok(loader.includes('SessionLoadResult'))

  assert.ok(httpSource.includes('class HttpSessionSource'))
  assert.ok(httpSource.includes('FetchClient'))
  assert.ok(httpSource.includes('constructor('), 'HttpSessionSource should receive the fetch client through DI')
})

test('developer experience documents validation and local sample workflow', async () => {
  const packageJson = JSON.parse(await readText('package.json'))
  const readme = await readText('README.md')
  const workflow = await readText('.github/workflows/ci.yml')

  assert.equal(packageJson.scripts['validate:session'], 'node scripts/validate-session-contract.mjs')
  assert.equal(packageJson.scripts['preview:built'], 'node scripts/serve-built-portal.mjs')
  assert.equal(packageJson.scripts['test:e2e'], 'playwright test')
  assert.ok(packageJson.scripts['check']?.includes('validate:session'))
  assert.ok(packageJson.scripts['check']?.includes('test:e2e'))
  assert.ok(packageJson.scripts['dev:sample']?.includes('nuxt dev'))

  assertFileExists('.env.example')
  assertFileExists('scripts/validate-session-contract.mjs')
  assertFileExists('scripts/serve-built-portal.mjs')

  assert.ok(readme.includes('npm run validate:session -- public/session.sample.json'))
  assert.ok(readme.includes('npm run dev:sample'))
  assert.ok(readme.includes('Архитектура'))
  assert.ok(readme.includes('core/session/domain'))
  assert.ok(readme.includes('features/session-dashboard'))
  assert.ok(readme.includes('components/shared/ui'))

  assert.ok(workflow.includes('npm run validate:session -- public/session.sample.json'))
  assert.ok(workflow.includes('npx playwright install --with-deps chromium'))
  assert.ok(workflow.includes('npm run test:e2e'))
})
