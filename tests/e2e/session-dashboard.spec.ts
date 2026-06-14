import { expect, test } from '@playwright/test'

test('renders the Greenplum academy dashboard from sample session state', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Greenplum Academy Portal/)
  await expect(page.getByRole('heading', { name: /Demo Student · greenplum/ })).toBeVisible()
  await expect(
    page
      .getByLabel('Текущий этап')
      .getByRole('heading', { name: 'Окружение и паспорт кластера' })
  ).toBeVisible()
  await expect(page.getByText('валиден')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Карта навыков' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Проверка понимания' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Academy Control Plane' })).toBeVisible()
  await expect(page.getByText('Слайды 1-4')).toBeVisible()
  await expect(page.getByText('mentor-lab.py portal greenplum export')).toBeVisible()
  await expect(page.getByText('02-greenplum-partitioning')).toBeVisible()
  await expect(page.getByText('python3 mentor-lab.py dataset greenplum generate')).toBeVisible()
})

test('keeps lesson controls reachable on a narrow viewport', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByLabel('Навигация урока')).toBeVisible()
  await expect(page.getByRole('link', { name: /00:00-10:00 Окружение/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Обновить state' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Копировать' }).first()).toBeVisible()
  await expect(page.getByText('Источник состояния: /api/session')).toBeVisible()
})
