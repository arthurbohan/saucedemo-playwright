import { test, expect } from '../fixtures/pages.fixture'
import { mockLoggedIn, mockLoggedOut, mockCrateSync } from './helpers/mockAuth'

test('shows user name and Log out when authenticated', async ({ page, explorePage, authPanel }) => {
  await mockLoggedIn(page, { id: 1, email: 'a@b.com', name: 'Test User' })
  await mockCrateSync(page) // logging in triggers useCrate's login-sync POST
  await explorePage.goto()
  await expect(authPanel.logout).toContainText('Test User')
})

test('shows Sign in link pointing to Google OAuth when not authenticated', async ({ page, explorePage, authPanel }) => {
  await mockLoggedOut(page)
  await explorePage.goto()
  await expect(authPanel.loginLink).toBeVisible()
  await expect(authPanel.loginLink).toHaveAttribute('href', '/api/auth/google')
})
