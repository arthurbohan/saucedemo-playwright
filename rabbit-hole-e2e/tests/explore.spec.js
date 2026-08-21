import { test, expect } from '@playwright/test'
import { mockGemini } from './helpers/mockGemini.js'
import { mockLoggedOut } from './helpers/mockAuth.js'

test.beforeEach(async ({ page }) => {
  await mockLoggedOut(page)
})

test('shows an empty/invite state on first visit with no saved session', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('search-input')).toBeVisible()
  await expect(page.getByTestId('node-name')).toHaveCount(0)
})

test('follow an artist shows the resulting node and 5 branches', async ({ page }) => {
  await mockGemini(page)
  await page.goto('/')

  await page.getByTestId('search-input').fill('Miles Davis')
  await page.getByTestId('follow').click()

  await expect(page.getByTestId('loading')).toBeVisible()
  await expect(page.getByTestId('node-name')).toHaveText('Miles Davis')
  await expect(page.getByTestId('branch')).toHaveCount(5)
})

test('surprise me follows the same load path with a random seed', async ({ page }) => {
  await mockGemini(page)
  await page.goto('/')

  await page.getByTestId('surprise').click()

  await expect(page.getByTestId('loading')).toBeVisible()
  await expect(page.getByTestId('node-name')).toBeVisible()
  await expect(page.getByTestId('branch')).toHaveCount(5)
})

test('API failure shows the error state, and retry re-issues the same request', async ({ page }) => {
  let callCount = 0
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

  await page.goto('/')
  await page.getByTestId('search-input').fill('Björk')
  await page.getByTestId('follow').click()

  await expect(page.getByTestId('error')).toBeVisible()
  await page.getByTestId('retry').click()
  await expect(page.getByTestId('node-name')).toHaveText('Björk')
  expect(callCount).toBe(2)
})

test('go here on a branch updates the trail and loads a new node', async ({ page }) => {
  await mockGemini(page)
  await page.goto('/')
  await page.getByTestId('search-input').fill('Radiohead')
  await page.getByTestId('follow').click()
  await expect(page.getByTestId('node-name')).toHaveText('Radiohead')

  await page.getByTestId('branch').first().getByRole('button', { name: 'Go here' }).click()
  await expect(page.getByTestId('node-name')).toHaveText('Ancestor Artist')
  await expect(page.getByTestId('trail')).toContainText('Radiohead')
})

test('clicking a breadcrumb in the trail jumps back and refetches', async ({ page }) => {
  await mockGemini(page)
  await page.goto('/')
  await page.getByTestId('search-input').fill('Radiohead')
  await page.getByTestId('follow').click()
  await expect(page.getByTestId('node-name')).toHaveText('Radiohead')

  await page.getByTestId('branch').first().getByRole('button', { name: 'Go here' }).click()
  await expect(page.getByTestId('node-name')).toHaveText('Ancestor Artist')

  await page.getByTestId('trail').getByRole('button', { name: 'Radiohead' }).click()
  await expect(page.getByTestId('node-name')).toHaveText('Radiohead')
})

test('dig deeper toggles notes open and closed', async ({ page }) => {
  await mockGemini(page, { deepText: 'Radiohead pioneered a fusion of rock and electronic textures.' })
  await page.goto('/')
  await page.getByTestId('search-input').fill('Radiohead')
  await page.getByTestId('follow').click()
  await expect(page.getByTestId('node-name')).toHaveText('Radiohead')

  // NodeCard renders before the branches.map() list — .first() is the node's own button
  await page.getByRole('button', { name: 'Dig deeper' }).first().click()
  await expect(page.getByText('Radiohead pioneered a fusion')).toBeVisible()
  await page.getByRole('button', { name: 'Close notes' }).click()
  await expect(page.getByText('Radiohead pioneered a fusion')).not.toBeVisible()
})
