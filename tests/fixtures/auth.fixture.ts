import { test as base, Page } from '@playwright/test'
import { SauceUser } from '../pages/loginPage'

export type AuthFixtures = {
    standardPage: Page
    problemPage: Page
}

async function setSession(page: Page, user: SauceUser) {
    await page.goto('/')
    await page.evaluate((u) => {
        localStorage.setItem('session-username', u)
    }, user)
    await page.goto('/inventory.html')
    await page.locator('.inventory_list').waitFor({ state: 'visible' })
}

export const authFixtures = base.extend<AuthFixtures>({

    standardPage: async ({ page }, use) => {
        await setSession(page, 'standard_user')
        await use(page)
        await page.evaluate(() => localStorage.clear())
    },

    problemPage: async ({ page }, use) => {
        await setSession(page, 'problem_user')
        await use(page)
        await page.evaluate(() => localStorage.clear())
    },
})