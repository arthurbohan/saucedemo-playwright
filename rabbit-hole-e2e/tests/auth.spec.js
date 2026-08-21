import { test, expect } from '@playwright/test'
import { mockLoggedIn, mockLoggedOut, mockCrateSync } from './helpers/mockAuth.js'

test('shows user name and Log out when authenticated', async ({ page }) => {
  await mockLoggedIn(page, { id: 1, email: 'a@b.com', name: 'Test User' })
  await mockCrateSync(page) // logging in triggers useCrate's login-sync POST
  await page.goto('/')
  await expect(page.getByTestId('logout')).toContainText('Test User')
})

test('shows Sign in link pointing to Google OAuth when not authenticated', async ({ page }) => {
  await mockLoggedOut(page)
  await page.goto('/')
  const signIn = page.getByTestId('login')
  await expect(signIn).toBeVisible()
  await expect(signIn).toHaveAttribute('href', '/api/auth/google')
})
