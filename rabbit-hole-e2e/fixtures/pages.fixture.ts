import { test as base, expect } from '@playwright/test'
import { ExplorePage } from '../pages/explorePage'
import { CratePanel } from '../pages/cratePanel'
import { AuthPanel } from '../pages/authPanel'

type PageFixtures = {
  explorePage: ExplorePage
  cratePanel: CratePanel
  authPanel: AuthPanel
}

export const test = base.extend<PageFixtures>({
  explorePage: async ({ page }, use) => {
    await use(new ExplorePage(page))
  },
  cratePanel: async ({ page }, use) => {
    await use(new CratePanel(page))
  },
  authPanel: async ({ page }, use) => {
    await use(new AuthPanel(page))
  },
})

export { expect }
