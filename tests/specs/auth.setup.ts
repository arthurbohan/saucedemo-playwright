import { test as setup, expect } from '@playwright/test'
import path from 'path'
import { LoginPage } from '../pages/loginPage'

export const AUTH_FILE = path.join(__dirname, '../.auth/standard.json')

setup('auth: save standard_user session', async ({ page }) => {
  const loginPage = new LoginPage(page)

  await loginPage.goto()
  await loginPage.loginAs('standard_user')

  await page.waitForURL('/inventory.html')
  await expect(page.locator('.inventory_list')).toBeVisible()
  await page.context().storageState({ path: AUTH_FILE })
})