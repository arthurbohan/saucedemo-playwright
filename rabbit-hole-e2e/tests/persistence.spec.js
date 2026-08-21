import { test, expect } from '@playwright/test'
import { mockGemini } from './helpers/mockGemini.js'
import { mockLoggedOut } from './helpers/mockAuth.js'

test.beforeEach(async ({ page }) => {
  await mockLoggedOut(page)
})

test('explore state survives a reload via localStorage', async ({ page }) => {
  await mockGemini(page)
  await page.goto('/')
  await page.getByTestId('search-input').fill('Sigur Ros')
  await page.getByTestId('follow').click()
  await expect(page.getByTestId('node-name')).toHaveText('Sigur Ros')

  await page.reload()
  await expect(page.getByTestId('node-name')).toHaveText('Sigur Ros')
  await expect(page.getByTestId('branch')).toHaveCount(5)
})

test('crate survives a reload', async ({ page }) => {
  await mockGemini(page)
  await page.goto('/')
  await page.getByTestId('search-input').fill('Burial')
  await page.getByTestId('follow').click()
  await page.getByRole('button', { name: 'Add to crate' }).first().click()
  await expect(page.getByTestId('crate-toggle')).toContainText('Crate · 1')

  await page.reload()
  await expect(page.getByTestId('crate-toggle')).toContainText('Crate · 1')
})
