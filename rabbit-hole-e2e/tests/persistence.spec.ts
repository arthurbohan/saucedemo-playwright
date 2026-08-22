import { test, expect } from '../fixtures/pages.fixture'
import { mockGemini } from './helpers/mockGemini'
import { mockLoggedOut } from './helpers/mockAuth'

test.beforeEach(async ({ page }) => {
  await mockLoggedOut(page)
})

test('explore state survives a reload via localStorage', async ({ page, explorePage }) => {
  await mockGemini(page)
  await explorePage.goto()
  await explorePage.follow('Sigur Ros')
  await expect(explorePage.nodeName).toHaveText('Sigur Ros')

  await page.reload()
  await expect(explorePage.nodeName).toHaveText('Sigur Ros')
  await expect(explorePage.branches).toHaveCount(5)
})

test('crate survives a reload', async ({ page, explorePage, cratePanel }) => {
  await mockGemini(page)
  await explorePage.goto()
  await explorePage.follow('Burial')
  await explorePage.addToCrate()
  await expect(cratePanel.toggle).toContainText('Crate · 1')

  await page.reload()
  await expect(cratePanel.toggle).toContainText('Crate · 1')
})
