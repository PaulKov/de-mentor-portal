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
    'core/catalog/domain/academy-catalog.ts',
    'core/catalog/application/catalog-contract.ts',
    'core/catalog/application/catalog-loader.ts',
    'core/catalog/infrastructure/http-catalog-source.ts',
    'assets/css/main.css',
    'assets/css/control-plane.css',
    'assets/css/cockpit.css',
    'assets/css/student-launchpad.css',
    'assets/css/lesson-hub.css',
    'assets/css/session-workspace.css',
    'assets/css/review-center.css',
    'assets/css/submission-inbox.css',
    'assets/css/cohort-dashboard.css',
    'assets/css/release-console.css',
    'features/academy-portal/AcademyPortal.vue',
    'features/lesson-hub/LessonHub.vue',
    'features/lesson-hub/TrackNavigation.vue',
    'features/lesson-hub/LessonList.vue',
    'features/lesson-hub/LessonActionRail.vue',
    'features/lesson-hub/useLessonHubState.ts',
    'features/lesson-hub/lesson-hub-state.ts',
    'features/lesson-launcher/LessonLauncher.vue',
    'features/lesson-launcher/useLessonLauncherState.ts',
    'features/lesson-launcher/lesson-launcher-state.ts',
    'features/session-workspace/SessionWorkspace.vue',
    'features/session-workspace/useSessionWorkspaceState.ts',
    'features/session-workspace/session-workspace-state.ts',
    'features/review-center/ReviewCenter.vue',
    'features/review-center/useReviewCenterState.ts',
    'features/review-center/review-center-state.ts',
    'features/submission-inbox/SubmissionInbox.vue',
    'features/submission-inbox/useSubmissionInboxState.ts',
    'features/submission-inbox/submission-inbox-state.ts',
    'features/cohort-dashboard/CohortDashboard.vue',
    'features/cohort-dashboard/useCohortDashboardState.ts',
    'features/cohort-dashboard/cohort-dashboard-state.ts',
    'features/release-console/ReleaseConsole.vue',
    'features/release-console/useReleaseConsoleState.ts',
    'features/release-console/release-console-state.ts',
    'features/session-dashboard/SessionDashboard.vue',
    'features/session-dashboard/DashboardModeSwitch.vue',
    'features/session-dashboard/session-dashboard-mode.ts',
    'features/session-dashboard/useSessionDashboardMode.ts',
    'features/session-status/SessionStatusBanner.vue',
    'features/timeline/SessionTimeline.vue',
    'features/commands/CommandList.vue',
    'features/evidence/EvidenceChecklist.vue',
    'features/control-plane/ControlPlanePanel.vue',
    'features/mentor-cockpit/MentorCockpit.vue',
    'features/mentor-cockpit/StagePlayer.vue',
    'features/mentor-cockpit/SlideCommandRail.vue',
    'features/mentor-cockpit/EvidencePanel.vue',
    'features/mentor-cockpit/ReleaseStatusStrip.vue',
    'features/mentor-cockpit/useMentorCockpitState.ts',
    'features/mentor-cockpit/mentor-cockpit-state.ts',
    'features/student-launchpad/StudentLaunchpad.vue',
    'features/student-launchpad/PlatformReadinessPanel.vue',
    'features/student-launchpad/StudentCommandChecklist.vue',
    'features/student-launchpad/StudentResourceRail.vue',
    'features/student-launchpad/useStudentLaunchpadState.ts',
    'features/student-launchpad/student-launchpad-state.ts',
    'features/skill-graph/SkillGraphPanel.vue',
    'components/shared/ui/AppShell.vue',
    'components/shared/ui/Panel.vue',
    'components/shared/ui/CopyButton.vue',
    'components/shared/ui/CopyCommand.vue',
    'components/shared/ui/StatusBadge.vue',
    'shared/utils/clipboard.ts',
    'shared/utils/local-storage.ts'
  ]

  for (const path of expectedFiles) {
    assertFileExists(path)
  }

  const app = await readText('app.vue')
  const dashboard = await readText('features/session-dashboard/SessionDashboard.vue')
  const portal = await readText('features/academy-portal/AcademyPortal.vue')
  const nuxtConfig = await readText('nuxt.config.ts')
  assert.ok(app.includes('<AcademyPortal'), 'app.vue should delegate rendering to AcademyPortal')
  assert.ok(app.includes('useCatalogState'), 'app.vue should load the academy catalog through a composable')
  assert.ok(app.includes('useSessionState'), 'app.vue should still load the live session through a composable')
  assert.ok(dashboard.includes('<MentorCockpit'), 'SessionDashboard should delegate valid sessions to MentorCockpit')
  assert.ok(dashboard.includes('<StudentLaunchpad'), 'SessionDashboard should delegate student mode to StudentLaunchpad')
  assert.ok(dashboard.includes('useSessionDashboardMode'), 'SessionDashboard should keep mode persistence in a composable')
  assert.ok(nuxtConfig.includes('~/assets/css/control-plane.css'), 'Nuxt should load control plane styles explicitly')
  assert.ok(nuxtConfig.includes('~/assets/css/cockpit.css'), 'Nuxt should load cockpit styles explicitly')
  assert.ok(nuxtConfig.includes('~/assets/css/student-launchpad.css'), 'Nuxt should load student launchpad styles explicitly')
  assert.ok(nuxtConfig.includes('~/assets/css/lesson-hub.css'), 'Nuxt should load lesson hub styles explicitly')
  assert.ok(nuxtConfig.includes('~/assets/css/session-workspace.css'), 'Nuxt should load session workspace styles explicitly')
  assert.ok(nuxtConfig.includes('~/assets/css/review-center.css'), 'Nuxt should load review center styles explicitly')
  assert.ok(nuxtConfig.includes('~/assets/css/submission-inbox.css'), 'Nuxt should load submission inbox styles explicitly')
  assert.ok(nuxtConfig.includes('~/assets/css/cohort-dashboard.css'), 'Nuxt should load cohort dashboard styles explicitly')
  assert.ok(nuxtConfig.includes('~/assets/css/release-console.css'), 'Nuxt should load release console styles explicitly')
  assert.ok(dashboard.includes('@open-workspace'), 'SessionDashboard should keep workspace navigation reachable')
  assert.ok(dashboard.includes('@open-review'), 'SessionDashboard should keep review navigation reachable')
  assert.ok(dashboard.includes('@open-submission'), 'SessionDashboard should keep submission navigation reachable')
  assert.ok(dashboard.includes('@open-cohort'), 'SessionDashboard should keep cohort navigation reachable')
  assert.ok(portal.includes('<ReviewCenter'), 'AcademyPortal should render Review Center as a portal surface')
  assert.ok(portal.includes('<SubmissionInbox'), 'AcademyPortal should render Submission Inbox as a portal surface')
  assert.ok(portal.includes('<CohortDashboard'), 'AcademyPortal should render Cohort Dashboard as a portal surface')
  assert.ok(portal.includes('<ReleaseConsole'), 'AcademyPortal should render Release Console as a portal surface')
  assert.ok(app.includes(':session-issues'), 'app.vue should pass live session validation issues through the portal facade')
  assert.ok(lineCount(app) <= 35, 'app.vue should stay a thin Nuxt facade')

  const composable = await readText('composables/useSessionState.ts')
  assert.ok(composable.includes('SessionLoader'), 'session composable should depend on the application loader')
  assert.ok(composable.includes('HttpSessionSource'), 'session composable should inject HTTP session sources')
  assert.ok(lineCount(composable) <= 85, 'useSessionState should stay a thin state facade')

  const catalogComposable = await readText('composables/useCatalogState.ts')
  assert.ok(catalogComposable.includes('CatalogLoader'), 'catalog composable should depend on the application loader')
  assert.ok(catalogComposable.includes('HttpCatalogSource'), 'catalog composable should inject HTTP catalog sources')
  assert.ok(lineCount(catalogComposable) <= 85, 'useCatalogState should stay a thin state facade')

  for (const path of [
    'features/mentor-cockpit/MentorCockpit.vue',
    'features/mentor-cockpit/StagePlayer.vue',
    'features/mentor-cockpit/SlideCommandRail.vue',
    'features/mentor-cockpit/EvidencePanel.vue',
    'features/mentor-cockpit/ReleaseStatusStrip.vue',
    'features/mentor-cockpit/useMentorCockpitState.ts',
    'features/mentor-cockpit/mentor-cockpit-state.ts',
    'features/student-launchpad/StudentLaunchpad.vue',
    'features/student-launchpad/PlatformReadinessPanel.vue',
    'features/student-launchpad/StudentCommandChecklist.vue',
    'features/student-launchpad/StudentResourceRail.vue',
    'features/student-launchpad/useStudentLaunchpadState.ts',
    'features/student-launchpad/student-launchpad-state.ts',
    'features/session-dashboard/DashboardModeSwitch.vue',
    'features/session-dashboard/useSessionDashboardMode.ts',
    'features/session-dashboard/session-dashboard-mode.ts',
    'features/academy-portal/AcademyPortal.vue',
    'features/lesson-hub/LessonHub.vue',
    'features/lesson-hub/TrackNavigation.vue',
    'features/lesson-hub/LessonList.vue',
    'features/lesson-hub/LessonActionRail.vue',
    'features/lesson-hub/useLessonHubState.ts',
    'features/lesson-hub/lesson-hub-state.ts',
    'features/lesson-launcher/LessonLauncher.vue',
    'features/lesson-launcher/useLessonLauncherState.ts',
    'features/lesson-launcher/lesson-launcher-state.ts',
    'features/session-workspace/SessionWorkspace.vue',
    'features/session-workspace/useSessionWorkspaceState.ts',
    'features/session-workspace/session-workspace-state.ts',
    'features/review-center/ReviewCenter.vue',
    'features/review-center/useReviewCenterState.ts',
    'features/review-center/review-center-state.ts',
    'features/submission-inbox/SubmissionInbox.vue',
    'features/submission-inbox/useSubmissionInboxState.ts',
    'features/submission-inbox/submission-inbox-state.ts',
    'features/cohort-dashboard/CohortDashboard.vue',
    'features/cohort-dashboard/useCohortDashboardState.ts',
    'features/cohort-dashboard/cohort-dashboard-state.ts',
    'features/release-console/ReleaseConsole.vue',
    'features/release-console/useReleaseConsoleState.ts',
    'features/release-console/release-console-state.ts',
    'assets/css/main.css',
    'assets/css/control-plane.css',
    'assets/css/cockpit.css',
    'assets/css/student-launchpad.css',
    'assets/css/lesson-hub.css',
    'assets/css/session-workspace.css',
    'assets/css/review-center.css',
    'assets/css/submission-inbox.css',
    'assets/css/cohort-dashboard.css',
    'assets/css/release-console.css'
  ]) {
    const source = await readText(path)
    assert.ok(lineCount(source) <= 400, `${path} should stay below the module SLOC guard`)
  }
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
  const envExample = await readText('.env.example')
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
  assert.ok(envExample.includes('ACADEMY_CATALOG='))
  assert.ok(envExample.includes('MENTOR_LAB_SESSION='))

  assert.ok(readme.includes('npm run validate:session -- public/session.sample.json'))
  assert.ok(readme.includes('npm run dev:sample'))
  assert.ok(readme.includes('Academy Lesson Hub'))
  assert.ok(readme.includes('Lesson Launcher'))
  assert.ok(readme.includes('Session Workspace'))
  assert.ok(readme.includes('Mentor Review Center'))
  assert.ok(readme.includes('Submission Inbox'))
  assert.ok(readme.includes('Cohort Progress Dashboard'))
  assert.ok(readme.includes('Lesson Release Console'))
  assert.ok(readme.includes('browser-local'))
  assert.ok(readme.includes('academy-catalog/v1'))
  assert.ok(readme.includes('launcher'))
  assert.ok(readme.includes('ACADEMY_CATALOG=/absolute/path/to/catalog.json npm run dev'))
  assert.ok(readme.includes('Mentor Live Cockpit'))
  assert.ok(readme.includes('Student Launchpad'))
  assert.ok(readme.includes('Windows + WSL2'))
  assert.ok(readme.includes('MENTOR_LAB_SESSION=/absolute/path/to/session.json npm run dev'))
  assert.ok(readme.includes('Архитектура'))
  assert.ok(readme.includes('core/session/domain'))
  assert.ok(readme.includes('core/catalog/domain'))
  assert.ok(readme.includes('features/academy-portal'))
  assert.ok(readme.includes('features/lesson-hub'))
  assert.ok(readme.includes('features/review-center'))
  assert.ok(readme.includes('features/submission-inbox'))
  assert.ok(readme.includes('features/cohort-dashboard'))
  assert.ok(readme.includes('features/release-console'))
  assert.ok(readme.includes('features/session-dashboard'))
  assert.ok(readme.includes('components/shared/ui'))

  assert.ok(workflow.includes('npm run validate:session -- public/session.sample.json'))
  assert.ok(workflow.includes('npx playwright install --with-deps chromium'))
  assert.ok(workflow.includes('npm run test:e2e'))
})
