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
  await expect(page.getByText('Почему partition key не равен distribution key?')).toBeVisible()
  await expect(page.getByText('python3 mentor-lab.py runbook greenplum-partitioning simple')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Вернуться в каталог' })).toBeVisible()
})

test('returns from current session to the lesson hub', async ({ page }) => {
  await openCurrentSession(page)

  await page.getByRole('button', { name: 'Вернуться в каталог' }).click()

  await expect(page.getByRole('heading', { name: 'Academy Lesson Hub' })).toBeVisible()
})

test('keeps cockpit controls reachable and responsive', async ({ page }) => {
  await openCurrentSession(page)

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
  await page.getByRole('button', { name: 'Открыть review' }).click()

  await expect(page.getByRole('heading', { name: 'Mentor Review Center' })).toBeVisible()
  await expect(page.getByText('50% evidence')).toBeVisible()
  await expect(page.getByText('1/2')).toBeVisible()
  await expect(page.getByText('Ученик сам объяснил pruning и retention.')).toBeVisible()
  await expect(page.getByText('Evidence gap: Statistics after load')).toBeVisible()
  await expect(page.getByText('Показать команду: ANALYZE lesson02.fact_sales_partitioned;')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Копировать Markdown' })).toBeVisible()
  await expect(page.getByLabel('Markdown report')).toHaveValue(/Evidence score: 1\/2 \(50%\)/)
  await expect(page.getByLabel('Markdown report')).toHaveValue(/Next lesson: Partitioning, statistics and incremental loads in MPP/)
})

test('renders student launchpad with platform readiness and resources', async ({ page }) => {
  await openCurrentSession(page)

  await page.getByRole('button', { name: 'Ученик' }).click()

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
