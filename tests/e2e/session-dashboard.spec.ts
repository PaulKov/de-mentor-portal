import { expect, test } from '@playwright/test'
import { join } from 'node:path'

const openCurrentSession = async page => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Открыть текущую сессию' }).click()
}

test('renders academy lesson hub from sample catalog', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Greenplum Academy Portal/)
  await expect(page.getByRole('heading', { name: 'Academy Lesson Hub' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Spark' })).toBeVisible()
  await expect(page.getByText('Greenplum Foundations')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Открыть текущую сессию' })).toBeVisible()
})

test('opens current session from the lesson hub', async ({ page }) => {
  await openCurrentSession(page)

  await expect(page.getByRole('heading', { name: 'Mentor Live Cockpit' })).toBeVisible()
  await expect(page.getByLabel('Stage player')).toBeVisible()
  await expect(page.getByLabel('Slides and commands')).toBeVisible()
  await expect(page.getByLabel('Evidence panel')).toBeVisible()
  await expect(page.getByText('control plane')).toBeVisible()
  await expect(page.getByText('валиден')).toBeVisible()
  await expect(page.getByLabel('Stage player').getByText('Почему partition key не равен distribution key?')).toBeVisible()
  await expect(page.getByLabel('Slides and commands').getByText('python3 mentor-lab.py runbook greenplum-partitioning simple')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Вернуться в каталог' })).toBeVisible()
})

test('returns from current session to the lesson hub', async ({ page }) => {
  await openCurrentSession(page)

  await page.getByRole('button', { name: 'Вернуться в каталог' }).click()

  await expect(page.getByRole('heading', { name: 'Academy Lesson Hub' })).toBeVisible()
})

test('keeps cockpit controls reachable and responsive', async ({ page }) => {
  await openCurrentSession(page)

  await expect(page.getByLabel('Lesson delivery control room')).toBeVisible()
  await expect(page.locator('.cockpit-layout')).toHaveCSS('display', 'grid')
  await expect(page.getByLabel('Навигация урока')).toBeVisible()
  await expect
    .poll(async () =>
      page.locator('.stage-player__body').evaluate(element =>
        Math.round(element.getBoundingClientRect().width)
      )
    )
    .toBeGreaterThan(240)
  await expect(page.getByRole('link', { name: /10:00-25:00 Partition pruning/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Обновить state' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Копировать' }).first()).toBeVisible()
  await expect(page.getByText('Источник состояния: /api/session')).toBeVisible()
})

test('runs lesson delivery control room during a mentor session', async ({ page }) => {
  await openCurrentSession(page)

  const controlRoom = page.getByLabel('Lesson delivery control room')
  await expect(controlRoom.getByText('Stage 2 / 3')).toBeVisible()
  await expect(controlRoom.getByText('15:00 planned')).toBeVisible()
  await expect(controlRoom.getByText('Что сказать')).toBeVisible()
  await expect(controlRoom.getByText('Что показать')).toBeVisible()
  await expect(controlRoom.getByText('Что спросить')).toBeVisible()
  await expect(controlRoom.getByText('Как проверить')).toBeVisible()
  await expect(controlRoom.getByText('Почему partition key не равен distribution key?')).toBeVisible()

  await controlRoom.getByRole('button', { name: 'Start timer' }).click()
  await expect(controlRoom.getByRole('button', { name: 'Pause timer' })).toBeVisible()

  await controlRoom.getByRole('button', { name: 'Mark evidence: Partition pruning' }).click()
  await expect(page.getByRole('checkbox', { name: /Partition pruning/ })).toBeChecked()

  await controlRoom.getByLabel('Control room note').fill('Control room note: ученик сам объяснил pruning.')
  await expect(page.getByLabel('Заметка по этапу')).toHaveValue('Control room note: ученик сам объяснил pruning.')

  await controlRoom.getByRole('button', { name: 'Стенд не поднялся' }).click()
  await expect(controlRoom.getByText('Fallback: открыть workbook/runbook')).toBeVisible()
})

test('records lesson run evidence ledger during a mentor session', async ({ page }) => {
  await openCurrentSession(page)

  const ledger = page.getByLabel('Lesson run evidence ledger')
  await expect(ledger.getByRole('heading', { name: 'Lesson Run Evidence Ledger' })).toBeVisible()
  await expect(ledger.getByText('0/3 done')).toBeVisible()
  await expect(ledger.getByText('0/2 evidence')).toBeVisible()
  await expect(ledger.getByText('Partition pruning and retention')).toBeVisible()
  await expect(ledger.getByText('Statistics after incremental load')).toBeVisible()

  await page.getByLabel('Lesson delivery control room')
    .getByRole('button', { name: 'Mark evidence: Partition pruning' })
    .click()
  await page.getByLabel('Control room note').fill('Ledger QA: ученик показал EXPLAIN pruning.')
  await ledger.getByRole('button', { name: 'Set Partition pruning and retention done' }).click()
  await ledger.getByLabel('Actual minutes for Partition pruning and retention').fill('18')
  await ledger.getByRole('button', { name: 'Set Statistics after incremental load risk' }).click()
  await ledger.getByLabel('Blocker for Statistics after incremental load').fill('Нет before/after EXPLAIN.')

  await expect(ledger.getByText('1/3 done')).toBeVisible()
  await expect(ledger.getByText('1/2 evidence')).toBeVisible()
  await expect(ledger.getByLabel('Lesson ledger markdown')).toHaveValue(/Partition pruning and retention: done/)
  await expect(ledger.getByLabel('Lesson ledger markdown')).toHaveValue(/actual 18 min/)
  await expect(ledger.getByLabel('Lesson ledger markdown')).toHaveValue(/blocker: Нет before\/after EXPLAIN\./)

  await page.reload()
  await expect(page.getByLabel('Lesson run evidence ledger')
    .getByRole('button', { name: 'Set Partition pruning and retention done' }))
    .toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Blocker for Statistics after incremental load')).toHaveValue('Нет before/after EXPLAIN.')
})

test('persists mentor evidence checks and stage notes locally', async ({ page }) => {
  await openCurrentSession(page)

  await page.getByRole('checkbox', { name: /Partition pruning/ }).check()
  await page.getByLabel('Заметка по этапу').fill('Ученик сам объяснил pruning и retention.')
  await page.reload()

  await expect(page.getByRole('checkbox', { name: /Partition pruning/ })).toBeChecked()
  await expect(page.getByLabel('Заметка по этапу')).toHaveValue('Ученик сам объяснил pruning и retention.')
})

test('builds mentor review from cockpit evidence and notes', async ({ page }) => {
  await openCurrentSession(page)

  await page.getByRole('checkbox', { name: /Partition pruning/ }).check()
  await page.getByLabel('Заметка по этапу').fill('Ученик сам объяснил pruning и retention.')
  const ledger = page.getByLabel('Lesson run evidence ledger')
  await ledger.getByRole('button', { name: 'Set Partition pruning and retention done' }).click()
  await ledger.getByLabel('Actual minutes for Partition pruning and retention').fill('18')
  await ledger.getByRole('button', { name: 'Set Statistics after incremental load risk' }).click()
  await ledger.getByLabel('Blocker for Statistics after incremental load').fill('Нет before/after EXPLAIN.')
  await page.getByRole('button', { name: 'Открыть review' }).click()

  await expect(page.getByRole('heading', { name: 'Mentor Review Center' })).toBeVisible()
  await expect(page.getByText('50% evidence')).toBeVisible()
  await expect(page.getByText('Ledger: 1/3 done · 1 risk · +3 min')).toBeVisible()
  await expect(page.getByText('1/2')).toBeVisible()
  await expect(page.getByText('Ученик сам объяснил pruning и retention.')).toBeVisible()
  await expect(page.getByText('Ledger: done · actual 18 min · delta +3 min')).toBeVisible()
  await expect(page.getByText('Blocker: Нет before/after EXPLAIN.')).toBeVisible()
  await expect(page.getByText('Evidence gap: Statistics after load')).toBeVisible()
  await expect(page.getByText('Ledger risk: Statistics after incremental load')).toBeVisible()
  await expect(page.getByText('Показать команду: ANALYZE lesson02.fact_sales_partitioned;')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Копировать Markdown' })).toBeVisible()
  await expect(page.getByLabel('Markdown report')).toHaveValue(/Evidence score: 1\/2 \(50%\)/)
  await expect(page.getByLabel('Markdown report')).toHaveValue(/## Ledger Signals/)
  await expect(page.getByLabel('Markdown report')).toHaveValue(/blocker: Нет before\/after EXPLAIN\./)
  await expect(page.getByLabel('Markdown report')).toHaveValue(/Next lesson: Partitioning, statistics and incremental loads in MPP/)
})

test('renders student launchpad with platform readiness and resources', async ({ page }) => {
  await openCurrentSession(page)

  await page.getByRole('button', { name: 'Ученик', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Student Launchpad' })).toBeVisible()
  await expect(page.getByLabel('Подготовка окружения ученика')).toBeVisible()
  await expect(page.getByText('docs/lessons/02-greenplum-partitioning/student-workbook.md')).toBeVisible()
  await expect(page.getByText('docs/lessons/02-greenplum-partitioning/homework.md')).toBeVisible()
  await expect(page.getByText('python3 mentor-lab.py doctor')).toBeVisible()

  await page.getByRole('button', { name: 'Windows + WSL2' }).click()
  await expect(page.getByText('wsl --status')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Student Launchpad' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Windows + WSL2' })).toHaveAttribute('aria-pressed', 'true')
})

test('lets a student submit homework evidence and opens it in the mentor inbox', async ({ page }) => {
  await openCurrentSession(page)

  await page.getByRole('button', { name: 'Ученик', exact: true }).click()
  await page.getByRole('button', { name: 'Сдать домашку' }).click()

  await expect(page.getByRole('heading', { name: 'Submission Inbox' })).toBeVisible()
  await expect(page.getByText('0% complete')).toBeVisible()

  await page.getByLabel('Evidence for Self-check commands').fill('doctor ok; release verify ok')
  await page.getByLabel('Evidence for Partition pruning').fill('EXPLAIN shows selected partitions only')
  await page.getByLabel('Evidence for Statistics after load').fill('ANALYZE executed; last_analyze is fresh')
  await page.getByLabel('Evidence for Next lesson readiness').fill('Prepared questions for Lesson 02')
  await page.getByRole('button', { name: 'Отправить submission' }).click()

  const mentorInbox = page.getByLabel('Mentor submission inbox')
  await expect(mentorInbox.getByText('ready-for-review')).toBeVisible()
  await expect(mentorInbox.getByText('100% complete')).toBeVisible()
  await expect(mentorInbox.getByText('EXPLAIN shows selected partitions only')).toBeVisible()
  await expect(page.getByLabel('Submission markdown')).toHaveValue(/Completeness: 4\/4 \(100%\)/)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Submission Inbox' })).toBeVisible()
  await expect(page.getByLabel('Mentor submission inbox').getByText('ready-for-review')).toBeVisible()
})

test('summarizes learner progress in the cohort dashboard', async ({ page }) => {
  await openCurrentSession(page)

  await page.getByRole('checkbox', { name: /Partition pruning/ }).check()
  const ledger = page.getByLabel('Lesson run evidence ledger')
  await ledger.getByRole('button', { name: 'Set Partition pruning and retention done' }).click()
  await ledger.getByLabel('Actual minutes for Partition pruning and retention').fill('18')
  await ledger.getByRole('button', { name: 'Set Statistics after incremental load risk' }).click()
  await ledger.getByLabel('Blocker for Statistics after incremental load').fill('Нет before/after EXPLAIN.')
  await page.getByRole('button', { name: 'Открыть submissions' }).click()
  await page.getByLabel('Evidence for Self-check commands').fill('doctor ok; release verify ok')
  await page.getByLabel('Evidence for Partition pruning').fill('EXPLAIN shows selected partitions only')
  await page.getByLabel('Evidence for Statistics after load').fill('ANALYZE executed; last_analyze is fresh')
  await page.getByLabel('Evidence for Next lesson readiness').fill('Prepared questions for Lesson 02')
  await page.getByRole('button', { name: 'Отправить submission' }).click()
  await page.getByRole('button', { name: 'Открыть cohort' }).click()

  await expect(page.getByRole('heading', { name: 'Cohort Progress Dashboard' })).toBeVisible()
  await expect(page.getByText('1 learner')).toBeVisible()
  await expect(page.getByText('50% avg evidence')).toBeVisible()
  await expect(page.getByText('ready-for-review')).toBeVisible()
  await expect(page.getByText('1 done · 1 risk · 0 skipped')).toBeVisible()
  await expect(page.getByText('+3 min · 1/2 evidence')).toBeVisible()
  await expect(page.getByText('Evidence gap: Statistics after load')).toBeVisible()
  await expect(page.getByText('Ledger risk: Statistics after incremental load')).toBeVisible()
  await expect(page.getByText('Нет before/after EXPLAIN.')).toBeVisible()
  await expect(page.getByLabel('Skill heatmap').getByText('Partition pruning')).toBeVisible()
  await expect(page.getByLabel('Cohort markdown')).toHaveValue(/Demo Student · greenplum-partitioning/)
  await expect(page.getByLabel('Cohort markdown')).toHaveValue(/Ledger: 1 done · 1 risk · 0 skipped; time \+3 min; evidence 1\/2/)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Cohort Progress Dashboard' })).toBeVisible()
  await expect(page.getByText('ready-for-review')).toBeVisible()
})

test('builds a post-lesson pack from review, ledger and homework signals', async ({ page }) => {
  await openCurrentSession(page)

  await page.getByRole('checkbox', { name: /Partition pruning/ }).check()
  await page.getByLabel('Заметка по этапу').fill('Ученик сам объяснил pruning и retention.')
  const ledger = page.getByLabel('Lesson run evidence ledger')
  await ledger.getByRole('button', { name: 'Set Partition pruning and retention done' }).click()
  await ledger.getByLabel('Actual minutes for Partition pruning and retention').fill('18')
  await ledger.getByRole('button', { name: 'Set Statistics after incremental load risk' }).click()
  await ledger.getByLabel('Blocker for Statistics after incremental load').fill('Нет before/after EXPLAIN.')

  await page.getByRole('button', { name: 'Открыть submissions' }).click()
  await page.getByLabel('Evidence for Self-check commands').fill('doctor ok; release verify ok')
  await page.getByLabel('Evidence for Partition pruning').fill('EXPLAIN shows selected partitions only')
  await page.getByLabel('Evidence for Statistics after load').fill('ANALYZE executed; last_analyze is fresh')
  await page.getByLabel('Evidence for Next lesson readiness').fill('Prepared questions for Lesson 02')
  await page.getByRole('button', { name: 'Отправить submission' }).click()

  await page.getByRole('button', { name: 'Post-Lesson Pack' }).click()

  await expect(page.getByRole('heading', { name: 'Post-Lesson Pack' })).toBeVisible()
  await expect(page.getByText('needs-attention')).toBeVisible()
  const metrics = page.getByLabel('Post-lesson metrics')
  await expect(metrics.getByText('50%', { exact: true })).toBeVisible()
  await expect(metrics.getByText('100%', { exact: true })).toBeVisible()
  await expect(metrics.getByText('+3 min', { exact: true })).toBeVisible()
  await expect(page.getByText('Submitted at:')).toBeVisible()
  await expect(page.getByLabel('Unresolved blockers').getByText('Нет before/after EXPLAIN.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Копировать Pack' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Копировать JSON' })).toBeVisible()
  await expect(page.getByLabel('Post-lesson packet markdown')).toHaveValue(/# Post-Lesson Pack/)
  await expect(page.getByLabel('Post-lesson packet markdown')).toHaveValue(/## Lesson Summary/)
  await expect(page.getByLabel('Post-lesson packet markdown')).toHaveValue(/## Homework/)
  await expect(page.getByLabel('Post-lesson packet markdown')).toHaveValue(/Homework: ready-for-review, 4\/4 \(100%\)/)
  await expect(page.getByLabel('Post-lesson packet markdown')).toHaveValue(/Next lesson: Partitioning, statistics and incremental loads in MPP/)
})

test('builds a skill assessment and learning path from lesson evidence', async ({ page }) => {
  await openCurrentSession(page)

  await page.getByRole('checkbox', { name: /Partition pruning/ }).check()
  await page.getByLabel('Заметка по этапу').fill('Ученик сам объяснил pruning и retention.')
  const ledger = page.getByLabel('Lesson run evidence ledger')
  await ledger.getByRole('button', { name: 'Set Partition pruning and retention done' }).click()
  await ledger.getByLabel('Actual minutes for Partition pruning and retention').fill('18')
  await ledger.getByRole('button', { name: 'Set Statistics after incremental load risk' }).click()
  await ledger.getByLabel('Blocker for Statistics after incremental load').fill('Нет before/after EXPLAIN.')

  await page.getByRole('button', { name: 'Открыть submissions' }).click()
  await page.getByLabel('Evidence for Self-check commands').fill('doctor ok; release verify ok')
  await page.getByLabel('Evidence for Partition pruning').fill('EXPLAIN shows selected partitions only')
  await page.getByLabel('Evidence for Statistics after load').fill('ANALYZE executed; last_analyze is fresh')
  await page.getByLabel('Evidence for Next lesson readiness').fill('Prepared questions for Lesson 02')
  await page.getByRole('button', { name: 'Отправить submission' }).click()

  await page.getByRole('button', { name: 'Skill Assessment Center' }).click()

  await expect(page.getByRole('heading', { name: 'Skill Assessment Center' })).toBeVisible()
  await expect(page.getByLabel('Assessment metrics').getByText('75%', { exact: true })).toBeVisible()
  await expect(page.getByText('can-apply')).toBeVisible()
  await expect(page.getByText('can-repeat')).toBeVisible()
  await expect(page.locator('.assessment-blocker').getByText('Нет before/after EXPLAIN.', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Learning path').getByText('Homework closure')).toBeVisible()
  await expect(page.getByLabel('Learning path').getByText('Lesson 02')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Копировать Assessment' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Копировать JSON' })).toBeVisible()
  await expect(page.getByLabel('Assessment report markdown')).toHaveValue(/# Skill Assessment/)
  await expect(page.getByLabel('Assessment report markdown')).toHaveValue(/Mastery: 75%/)
  await expect(page.getByLabel('Assessment report markdown')).toHaveValue(/Statistics after load: can-repeat/)
  await expect(page.getByLabel('Assessment report markdown')).toHaveValue(/Next lesson: Partitioning, statistics and incremental loads in MPP/)
})

test('opens lesson release console and shows go no-go checks', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('main').getByRole('button', { name: 'Release Console' }).click()

  await expect(page.getByRole('heading', { name: 'Lesson Release Console' })).toBeVisible()
  await expect(page.getByText('go/no-go')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Partitioning, Statistics and Incremental Loads' })
  ).toBeVisible()
  await expect(page.getByText('Google Slides / deck')).toBeVisible()
  await expect(page.getByText('SQL lab', { exact: true })).toBeVisible()
  await expect(page.getByText('python3 mentor-lab.py lesson-release greenplum-partitioning verify')).toBeVisible()
  await expect(page.getByLabel('Release markdown')).toHaveValue(/Go\/no-go: go/)
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      )
    )
    .toBe(true)

  await page.getByRole('button', { name: 'ClickHouse' }).click()
  await expect(page.getByLabel('Selected release detail').getByText('blocked')).toBeVisible()
  await expect(page.getByLabel('Release risks').getByText('Lesson status is planned.')).toBeVisible()
})

test('opens global command center and navigates between portal surfaces', async ({ page }) => {
  await openCurrentSession(page)

  const ledger = page.getByLabel('Lesson run evidence ledger')
  await ledger.getByRole('button', { name: 'Set Partition pruning and retention done' }).click()

  await expect(page.getByLabel('Global portal navigation')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Command Center' })).toBeVisible()
  await expect(page.getByLabel('Global portal navigation')
    .getByText('Demo Student · greenplum-partitioning'))
    .toBeVisible()

  await page.getByRole('button', { name: 'Command Center' }).click()
  const commandCenter = page.getByRole('dialog', { name: 'Command Center' })
  await expect(commandCenter).toBeVisible()
  await expect(commandCenter.locator('.command-center__header')
    .getByText('Demo Student · greenplum-partitioning'))
    .toBeVisible()
  await expect(commandCenter.getByText('python3 mentor-lab.py portal greenplum start')).toBeVisible()
  await expect(commandCenter.getByRole('button', { name: 'Скопировать ledger report' })).toBeVisible()
  await expect(commandCenter.getByText('Lesson Run Ledger')).toBeVisible()
  await expect(commandCenter.getByRole('button', { name: 'Скопировать команду текущего этапа' })).toBeVisible()
  await expect(commandCenter.getByRole('button', { name: 'Скопировать вопрос текущего этапа' })).toBeVisible()

  await commandCenter.getByRole('button', { name: 'Открыть Release Console' }).click()
  await expect(page.getByRole('heading', { name: 'Lesson Release Console' })).toBeVisible()

  await page.getByRole('button', { name: 'Command Center' }).click()
  await page.getByRole('dialog', { name: 'Command Center' })
    .getByRole('button', { name: 'Открыть Mentor Live Cockpit' })
    .click()
  await expect(page.getByRole('heading', { name: 'Mentor Live Cockpit' })).toBeVisible()
})

test('keeps global command center usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await page.getByRole('button', { name: 'Command Center' }).click()

  await expect(page.getByRole('dialog', { name: 'Command Center' })).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      )
    )
    .toBe(true)
})

test('selects Spark track and student commands in the lesson hub', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Spark' }).click()
  await page.getByRole('button', { name: 'Ученик' }).click()

  await expect(page.getByText('Spark Runtime Foundations')).toBeVisible()
  await expect(page.getByText('spark on yarn')).toBeVisible()
  await expect(page.getByText('python3 mentor-lab.py runbook spark intro student')).toBeVisible()
})

test('builds a lesson launch packet from the hub', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Запуск урока' })).toBeVisible()
  await page.getByLabel('Имя ученика').fill('Мария')
  await page.getByRole('button', { name: 'Deep-dive path' }).click()
  await page.getByRole('button', { name: 'Windows + WSL2' }).click()
  await page.getByLabel('Папка session').fill('artifacts/sessions/maria')

  await expect(page.getByText('python3 mentor-lab.py session greenplum start --student "Мария" --route deep --output artifacts/sessions/maria')).toBeVisible()
  await expect(page.getByText('python3 mentor-lab.py runbook greenplum deep')).toBeVisible()
  await expect(page.getByText('wsl --status')).toBeVisible()
})

test('imports a session file into workspace and opens it in cockpit', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Открыть сессии' }).click()
  await expect(page.getByRole('heading', { name: 'Session Workspace' })).toBeVisible()

  await page.locator('input[type="file"]').setInputFiles(
    join(process.cwd(), 'public/session.sample.json')
  )

  await expect(
    page.getByRole('button', { name: /Demo Student greenplum-partitioning/ })
  ).toBeVisible()
  await expect(page.getByText('Partition pruning and retention').first()).toBeVisible()

  await page.getByRole('button', { name: 'Открыть cockpit' }).first().click()

  await expect(page.getByRole('heading', { name: 'Mentor Live Cockpit' })).toBeVisible()
  await expect(
    page.getByText('Источник состояния: workspace:Demo Student:greenplum-partitioning')
  ).toBeVisible()
})
