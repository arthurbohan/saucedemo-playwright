/**
 * fixtures/healing.fixture.ts
 *
 * Exposes the self-healing function as a Playwright fixture.
 * Merge this into your fixtures/index.ts alongside other fixtures.
 *
 * Usage in tests:
 *   import { test, expect } from '../../fixtures'
 *
 *   test('add to cart', async ({ inventoryPage, heal }) => {
 *     const btn = await heal(
 *       inventoryPage.page,
 *       inventoryPage.addToCartBtn('sauce-labs-backpack'),
 *       'Add to cart button for Sauce Labs Backpack'
 *     )
 *     await btn.click()
 *   })
 */

import { test as base, Page, Locator } from '@playwright/test'
import path                            from 'path'
import { heal as healFn }              from '../../helpers/selfHealing'

// ─── Fixture type ─────────────────────────────────────────────────────────────

type HealFixture = {
  /**
   * heal(page, locator, description)
   *
   * Tries the original locator first. If it fails within 3s,
   * asks Groq to find an alternative based on the page snapshot.
   *
   * Returns the working locator (original or healed).
   */
  heal: (page: Page, locator: Locator, description: string) => Promise<Locator>
}

// ─── Fixture implementation ───────────────────────────────────────────────────

export const healingFixtures = base.extend<HealFixture>({

  heal: async ({}, use, testInfo) => {
    await use(async (page, locator, description) => {
      const result = await healFn(page, locator, description, {
        // titlePath[0] is the file path itself — drop it, testFile carries that separately
        testTitle: testInfo.titlePath.slice(1).join(' > '),
        testFile: path.relative(process.cwd(), testInfo.file),
      })
      return result.locator
    })
  },

})