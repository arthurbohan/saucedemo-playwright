import { test, expect } from '@playwright/test'
import { mockGemini } from './helpers/mockGemini.js'
import { mockLoggedOut } from './helpers/mockAuth.js'
import { mockPreview } from './helpers/mockPreview.js'

test('play preview toggles to stop, and playing another track stops the first', async ({ page }) => {
  await mockLoggedOut(page)
  await mockGemini(page)
  await mockPreview(page)
  await page.goto('/')
  await page.getByTestId('search-input').fill('Four Tet')
  await page.getByTestId('follow').click()
  await expect(page.getByTestId('node-name')).toHaveText('Four Tet')

  const nodePlay = page.getByRole('button', { name: 'Play preview' }).first()
  await nodePlay.click()
  await expect(page.getByRole('button', { name: 'Stop preview' }).first()).toBeVisible()

  const branchPlay = page.getByTestId('branch').first().getByRole('button', { name: 'Play preview' })
  await branchPlay.click()
  await expect(page.getByTestId('branch').first().getByRole('button', { name: 'Stop preview' })).toBeVisible()
  // node's button reverts to Play once the branch's audio takes over (single global player)
  await expect(page.getByRole('button', { name: 'Play preview' }).first()).toBeVisible()
})
