import { test, expect } from '../fixtures/pages.fixture'
import { mockGemini } from './helpers/mockGemini'
import { mockLoggedOut } from './helpers/mockAuth'

test.beforeEach(async ({ page }) => {
  await mockLoggedOut(page)
})

test('shows an empty/invite state on first visit with no saved session', async ({ explorePage }) => {
  await explorePage.goto()
  await expect(explorePage.searchInput).toBeVisible()
  await expect(explorePage.nodeName).toHaveCount(0)
})

test('follow an artist shows the resulting node and 5 branches', async ({ page, explorePage }) => {
  await mockGemini(page)
  await explorePage.goto()
  await explorePage.follow('Miles Davis')

  await expect(explorePage.loadingIndicator).toBeVisible()
  await expect(explorePage.nodeName).toHaveText('Miles Davis')
  await expect(explorePage.branches).toHaveCount(5)
})

test('surprise me follows the same load path with a random seed', async ({ page, explorePage }) => {
  await mockGemini(page)
  await explorePage.goto()
  await explorePage.surpriseMe()

  await expect(explorePage.loadingIndicator).toBeVisible()
  await expect(explorePage.nodeName).toBeVisible()
  await expect(explorePage.branches).toHaveCount(5)
})

test('API failure shows the error state, and retry re-issues the same request', async ({ page, explorePage }) => {
  let callCount = 0
  // Routes on request content, not call order — see helpers/mockGemini.ts
  await page.route('**/api/gemini/v1beta/interactions', async (route) => {
    callCount++
    if (callCount === 1) {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'mocked failure' }) })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'completed',
        steps: [{
          type: 'model_output',
          content: [{ type: 'text', text: JSON.stringify({ node: { name: 'Björk', tagline: 't', track: 'Björk — Song (2020)' }, branches: [] }) }],
        }],
      }),
    })
  })

  await explorePage.goto()
  await explorePage.follow('Björk')

  await expect(explorePage.errorState).toBeVisible()
  await explorePage.retry()
  await expect(explorePage.nodeName).toHaveText('Björk')
  expect(callCount).toBe(2)
})

test('go here on a branch updates the trail and loads a new node', async ({ page, explorePage }) => {
  await mockGemini(page)
  await explorePage.goto()
  await explorePage.follow('Radiohead')
  await expect(explorePage.nodeName).toHaveText('Radiohead')

  await explorePage.goHereOnBranch()
  await expect(explorePage.nodeName).toHaveText('Ancestor Artist')
  await expect(explorePage.trail).toContainText('Radiohead')
})

test('clicking a breadcrumb in the trail jumps back and refetches', async ({ page, explorePage }) => {
  await mockGemini(page)
  await explorePage.goto()
  await explorePage.follow('Radiohead')
  await expect(explorePage.nodeName).toHaveText('Radiohead')

  await explorePage.goHereOnBranch()
  await expect(explorePage.nodeName).toHaveText('Ancestor Artist')

  await explorePage.jumpToTrailBreadcrumb('Radiohead')
  await expect(explorePage.nodeName).toHaveText('Radiohead')
})

test('dig deeper toggles notes open and closed', async ({ page, explorePage }) => {
  await mockGemini(page, { deepText: 'Radiohead pioneered a fusion of rock and electronic textures.' })
  await explorePage.goto()
  await explorePage.follow('Radiohead')
  await expect(explorePage.nodeName).toHaveText('Radiohead')

  await explorePage.digDeeper()
  await expect(explorePage.notesText('Radiohead pioneered a fusion')).toBeVisible()
  await explorePage.closeNotes()
  await expect(explorePage.notesText('Radiohead pioneered a fusion')).not.toBeVisible()
})
