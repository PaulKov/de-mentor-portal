import { expect, test } from '@playwright/test'

test('renders the mentor live cockpit from sample session state', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Greenplum Academy Portal/)
  await expect(page.getByRole('heading', { name: 'Mentor Live Cockpit' })).toBeVisible()
  await expect(page.getByLabel('Stage player')).toBeVisible()
  await expect(page.getByLabel('Slides and commands')).toBeVisible()
  await expect(page.getByLabel('Evidence panel')).toBeVisible()
  await expect(page.getByText('control plane')).toBeVisible()
  await expect(page.getByText('валиден')).toBeVisible()
  await expect(page.getByText('Почему partition key не равен distribution key?')).toBeVisible()
  await expect(page.getByText('python3 mentor-lab.py runbook greenplum-partitioning simple')).toBeVisible()
})

test('keeps cockpit controls reachable and responsive', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('.cockpit-layout')).toHaveCSS('display', 'grid')
  await expect(page.getByLabel('Навигация урока')).toBeVisible()
  await expect(page.getByRole('link', { name: /10:00-25:00 Partition pruning/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Обновить state' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Копировать' }).first()).toBeVisible()
  await expect(page.getByText('Источник состояния: /api/session')).toBeVisible()
})

test('persists mentor evidence checks and stage notes locally', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('checkbox', { name: /Partition pruning/ }).check()
  await page.getByLabel('Заметка по этапу').fill('Ученик сам объяснил pruning и retention.')
  await page.reload()

  await expect(page.getByRole('checkbox', { name: /Partition pruning/ })).toBeChecked()
  await expect(page.getByLabel('Заметка по этапу')).toHaveValue('Ученик сам объяснил pruning и retention.')
})

test('renders student launchpad with platform readiness and resources', async ({ page }) => {
  await page.goto('/')

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
