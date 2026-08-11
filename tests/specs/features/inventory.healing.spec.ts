/**
 * specs/features/inventory.healing.spec.ts
 *
 * Demonstrates self-healing locators on saucedemo.com.
 *
 * Three test scenarios:
 *   1. Normal test — original locator works, no healing needed
 *   2. Healed test — broken locator, AI finds the real one
 *   3. Page Object test — healing built into the Page Object method
 *
 * Run:
 *   npx playwright test specs/features/inventory.healing.spec.ts --headed
 */

import { test, expect } from '../../fixtures'

// ─── Scenario 1: Original locator works fine ──────────────────────────────────
// heal() checks the locator first — if it works, no API call is made.

test('heal: original locator works — no healing triggered', async ({
  inventoryPage,
  heal,
}) => {
  // This locator is correct — heal() will use it as-is
  const addBtn = inventoryPage.addToCartBtn('sauce-labs-backpack')

  const healedBtn = await heal(
    inventoryPage.page,
    addBtn,
    'Add to cart button for Sauce Labs Backpack',
  )

  await healedBtn.click()

  // Badge should show 1
  expect(await inventoryPage.getCartCount()).toBe(1)
})

// ─── Scenario 2: Broken locator — AI heals it ────────────────────────────────
// We intentionally use a wrong selector to simulate a UI change.
// heal() will detect the failure and ask Groq for a working alternative.

test('heal: broken locator — AI finds the correct element', async ({
  inventoryPage,
  heal,
}) => {
  // Simulating a UI change — the data-test attribute was renamed
  // Old: data-test="add-to-cart-sauce-labs-backpack"
  // New (fictional): data-test="btn-add-sauce-labs-backpack"
  const brokenLocator = inventoryPage.page.locator(
    '[data-test="btn-add-sauce-labs-backpack"]',   // ← does not exist
  )

  // heal() will:
  // 1. Try brokenLocator → not found after 3s
  // 2. Take accessibility snapshot
  // 3. Ask Groq: "find Add to cart button for Sauce Labs Backpack"
  // 4. Return a working locator
  const healedBtn = await heal(
    inventoryPage.page,
    brokenLocator,
    'Add to cart button for Sauce Labs Backpack',
  )

  await healedBtn.click()

  // Test continues successfully even though original locator was wrong
  expect(await inventoryPage.getCartCount()).toBe(1)
})

// ─── Scenario 3: Healing the sort dropdown ────────────────────────────────────

test('heal: broken sort dropdown — AI finds it', async ({
  inventoryPage,
  heal,
}) => {
  // Simulate the sort dropdown selector changing
  const brokenDropdown = inventoryPage.page.locator(
    '[data-test="sort-container"]',               // ← wrong, real is "product-sort-container"
  )

  const healedDropdown = await heal(
    inventoryPage.page,
    brokenDropdown,
    'Product sort dropdown — allows sorting by name or price',
  )

  // Select Low to High
  await healedDropdown.selectOption('lohi')

  // Verify sorting worked
  const prices = await inventoryPage.getItemPrices()
  for (let i = 1; i < prices.length; i++) {
    expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1])
  }
})

// ─── Scenario 4: Multiple healed locators in one test ────────────────────────

test('heal: full add-to-cart flow with broken locators', async ({
  inventoryPage,
  heal,
}) => {
  // Both locators are intentionally broken
  const brokenAddBtn = inventoryPage.page.locator(
    '[data-broken="add-to-cart-sauce-labs-bike-light"]',
  )
  const brokenCartIcon = inventoryPage.page.locator(
    '.broken-cart-icon',
  )

  // Heal add button
  const addBtn = await heal(
    inventoryPage.page,
    brokenAddBtn,
    'Add to cart button for Sauce Labs Bike Light',
  )
  await addBtn.click()
  expect(await inventoryPage.getCartCount()).toBe(1)

  // Heal cart icon
  const cartIcon = await heal(
    inventoryPage.page,
    brokenCartIcon,
    'Shopping cart icon link in the navigation bar',
  )
  await cartIcon.click()

  // Should be on cart page
  await expect(inventoryPage.page).toHaveURL(/cart/)
})