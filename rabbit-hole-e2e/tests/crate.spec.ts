import { test, expect } from '../fixtures/pages.fixture'
import { mockGemini } from './helpers/mockGemini'
import { mockLoggedIn, mockLoggedOut } from './helpers/mockAuth'

test.beforeEach(async ({ page }) => {
  await mockLoggedOut(page)
  await mockGemini(page)
})

test('add to crate toggles state, updates the header count, and shows in the panel', async ({ explorePage, cratePanel }) => {
  await explorePage.goto()
  await explorePage.follow('Aphex Twin')
  await expect(explorePage.nodeName).toHaveText('Aphex Twin')

  await explorePage.addToCrate()
  await expect(explorePage.inCrateButton).toBeVisible()
  await expect(cratePanel.toggle).toContainText('Crate · 1')

  await cratePanel.open()
  await expect(cratePanel.panel).toContainText('Aphex Twin')
})

test('remove from crate removes the item', async ({ explorePage, cratePanel }) => {
  await explorePage.goto()
  await explorePage.follow('Boards of Canada')
  await explorePage.addToCrate()

  await cratePanel.open()
  await expect(cratePanel.panel).toContainText('Boards of Canada')

  await cratePanel.removeItem()
  await expect(cratePanel.panel).toContainText('Nothing here yet')
})

test('clicking a crated artist name relaunches explore from that point and closes the panel', async ({ explorePage, cratePanel }) => {
  await explorePage.goto()
  await explorePage.follow('Boards of Canada')
  await explorePage.addToCrate()
  await cratePanel.open()

  await cratePanel.selectArtist('Boards of Canada')

  // Panel closes via a CSS class (is-open), not removal from the DOM/display:none
  await expect(cratePanel.panel).not.toHaveClass(/is-open/)
  await expect(explorePage.nodeName).toHaveText('Boards of Canada')
})

test('crate syncs to the server once on login', async ({ page, explorePage, authPanel }) => {
  const posts: Array<{ items?: unknown[] }> = []
  // Single handler — capture AND fulfill in one place, rather than composing
  // two page.route() registrations that would race/shadow each other.
  await page.route('**/api/crate', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    const body = route.request().postDataJSON()
    posts.push(body)
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: body?.items ?? [] }) })
  })

  await explorePage.goto()
  await explorePage.follow('Burial')
  await explorePage.addToCrate()

  await mockLoggedIn(page)
  await page.reload()
  await expect(authPanel.logout).toBeVisible()
  await expect.poll(() => posts.length).toBe(1)
  expect(posts[0].items).toHaveLength(1)
})
