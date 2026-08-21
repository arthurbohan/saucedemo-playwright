import { test, expect } from '@playwright/test'
import { mockGemini } from './helpers/mockGemini.js'
import { mockLoggedIn, mockLoggedOut } from './helpers/mockAuth.js'

test.beforeEach(async ({ page }) => {
  await mockLoggedOut(page)
  await mockGemini(page)
})

test('add to crate toggles state, updates the header count, and shows in the panel', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('search-input').fill('Aphex Twin')
  await page.getByTestId('follow').click()
  await expect(page.getByTestId('node-name')).toHaveText('Aphex Twin')

  await page.getByRole('button', { name: 'Add to crate' }).first().click()
  await expect(page.getByRole('button', { name: 'In crate' }).first()).toBeVisible()
  await expect(page.getByTestId('crate-toggle')).toContainText('Crate · 1')

  await page.getByTestId('crate-toggle').click()
  await expect(page.getByTestId('crate-panel')).toContainText('Aphex Twin')
})

test('remove from crate removes the item', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('search-input').fill('Boards of Canada')
  await page.getByTestId('follow').click()
  await page.getByRole('button', { name: 'Add to crate' }).first().click()

  await page.getByTestId('crate-toggle').click()
  await expect(page.getByTestId('crate-panel')).toContainText('Boards of Canada')

  await page.getByRole('button', { name: 'Remove from crate' }).click()
  await expect(page.getByTestId('crate-panel')).toContainText('Nothing here yet')
})

test('clicking a crated artist name relaunches explore from that point and closes the panel', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('search-input').fill('Boards of Canada')
  await page.getByTestId('follow').click()
  await page.getByRole('button', { name: 'Add to crate' }).first().click()
  await page.getByTestId('crate-toggle').click()

  await page.getByTestId('crate-panel').getByRole('button', { name: 'Boards of Canada' }).click()

  // Panel closes via a CSS class (is-open), not removal from the DOM/display:none
  await expect(page.getByTestId('crate-panel')).not.toHaveClass(/is-open/)
  await expect(page.getByTestId('node-name')).toHaveText('Boards of Canada')
})

test('crate syncs to the server once on login', async ({ page }) => {
  const posts = []
  // Single handler — capture AND fulfill in one place, rather than composing
  // two page.route() registrations that would race/shadow each other.
  await page.route('**/api/crate', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    const body = route.request().postDataJSON()
    posts.push(body)
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: body?.items ?? [] }) })
  })

  await page.goto('/')
  await page.getByTestId('search-input').fill('Burial')
  await page.getByTestId('follow').click()
  await page.getByRole('button', { name: 'Add to crate' }).first().click()

  await mockLoggedIn(page)
  await page.reload()
  await expect(page.getByTestId('logout')).toBeVisible()
  await expect.poll(() => posts.length).toBe(1)
  expect(posts[0].items).toHaveLength(1)
})
