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
