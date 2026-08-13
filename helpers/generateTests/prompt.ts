/**
 * helpers/scripts/generateTests/prompt.ts
 *
 * System context and prompt builder for test generation.
 * Describes project architecture so Groq generates compatible code.
 */

import { FeatureKey } from './types'

const SYSTEM_CONTEXT = `
You are an expert QA automation engineer. Write Playwright tests in TypeScript.

PROJECT ARCHITECTURE:
\`\`\`
tests/
├── specs/
│   ├── features/   ← E2E tests (target folder)
│   └── api/
├── builders/
│   ├── ShippingInfoBuilder.ts
│   └── index.ts
└── types/
    └── api.types.ts

fixtures/
└── index.ts        ← export { test, expect }

pages/
├── BasePage.ts
├── LoginPage.ts
├── InventoryPage.ts
├── CartPage.ts
├── CheckoutPage.ts
└── index.ts
\`\`\`

IMPORTS — USE ONLY WHAT THE SPEC ACTUALLY NEEDS:
\`\`\`typescript
import { test, expect }           from '../../fixtures'
import { ShippingInfoBuilder }    from '../../builders'           // only in checkout spec
import { CartPage, CheckoutPage } from '../../pages'             // only in E2E flow tests
import type { ShippingInfo }      from '../../pages/CheckoutPage' // only in checkout spec
import type { ProductSlug }       from '../../pages/InventoryPage' // only in inventory spec
\`\`\`

AVAILABLE FIXTURES AND HOW TO USE THEM:
\`\`\`typescript
// Always destructure page separately when you need URL or page-level assertions
test('example', async ({ loginPage, page }) => {
  await loginPage.loginAs('standard_user')
  await expect(page).toHaveURL(/inventory/)         // ✅ page for URL assertions
  await expect(page).toHaveTitle('Swag Labs')       // ✅ page for title
})

// Never use loginPage.page — page is a test parameter, not a Page Object property
// ❌ await expect(loginPage.page).toContainText('Products')
// ✅ await expect(page).toHaveURL(/inventory/)
// ✅ await expect(page.getByText('Products')).toBeVisible()
\`\`\`

FIXTURES:
- loginPage      → LoginPage,      opened at '/'
- inventoryPage  → InventoryPage,  logged in as standard_user, on /inventory.html
- cartPage       → CartPage,       logged in, empty cart, on /cart.html
- filledCartPage → CartPage,       logged in, backpack + bike light in cart
- checkoutPage   → CheckoutPage,   logged in, backpack in cart, on /checkout-step-one.html

PAGE OBJECT METHODS AND LOCATORS:

LoginPage:
  Locators: .usernameInput, .passwordInput, .loginButton, .errorMessage, .errorDismiss
            .credentialsHint, .passwordHint
  Methods:  .goto(), .login(user, pass), .loginAs(user: SauceUser)
            .getErrorText(), .dismissError(), .isErrorVisible()
            .loginHealed(user, pass), .loginAsHealed(user)
  SauceUser values: 'standard_user' | 'locked_out_user' | 'problem_user' | 'performance_glitch_user'

InventoryPage:
  Locators: .inventoryList, .inventoryItems, .cartBadge, .cartIcon
            .sortDropdown, .pageTitle, .burgerMenu, .openedBurgerMenu
            .addToCartBtn(slug), .removeBtn(slug), .itemByName(name)
  Methods:  .goto(), .addToCart(slug), .removeFromCart(slug)
            .sortBy(option), .goToCart(), .openBurgerMenu(), .logout()
            .getItemNames(), .getItemPrices(), .getCartCount()
            .addToCartHealed(slug), .removeFromCartHealed(slug)
            .sortByHealed(option), .goToCartHealed()

CartPage:
  Locators: .cartItems, .checkoutButton, .continueShoppingButton, .itemQuantities
            .itemNames(), .itemPrices(), .removeItemBtn(name)
  Methods:  .goto(), .getItemCount(), .getItemNames(), .getItemPrices()
            .removeItem(name), .checkout(), .continueShopping(), .isEmpty()
            .checkoutHealed(), .continueShoppingHealed()

CheckoutPage:
  Locators: .firstNameInput, .lastNameInput, .postalCodeInput
            .continueButton, .cancelButton, .errorMessage
            .summaryItems, .summarySubtotal, .summaryTax, .summaryTotal
            .finishButton, .successHeader, .successText, .backHomeButton
  Methods:  .goto(), .fillShippingInfo(info), .getSummaryTotal()
            .finish(), .isOrderComplete(), .backToProducts()
            .fillShippingInfoHealed(info), .getSummaryTotalHealed()
            .finishHealed(), .backToProductsHealed()
            .getTextOf(locator)   ← from BasePage

ShippingInfoBuilder (checkout spec only):
  new ShippingInfoBuilder().build()
  new ShippingInfoBuilder().withFirstName(v).build()
  new ShippingInfoBuilder().withEmptyFirstName().build()
  new ShippingInfoBuilder().withEmptyLastName().build()
  new ShippingInfoBuilder().withEmptyPostalCode().build()

ASSERTIONS — CORRECT USAGE:
\`\`\`typescript
// Page-level (use page fixture, NOT loginPage.page)
await expect(page).toHaveURL(/inventory/)
await expect(page).toHaveURL('https://www.saucedemo.com/')
await expect(page).toHaveTitle('Swag Labs')

// Locator-level (use Page Object locators directly)
await expect(loginPage.errorMessage).toBeVisible()
await expect(loginPage.errorMessage).toContainText('locked out')
await expect(loginPage.errorMessage).not.toBeVisible()
await expect(inventoryPage.inventoryItems).toHaveCount(6)
await expect(inventoryPage.cartBadge).toHaveText('1')
await expect(inventoryPage.cartBadge).not.toBeVisible()
await expect(checkoutPage.successHeader).toHaveText('Thank you for your order!')
await expect(page.getByText('Products')).toBeVisible()   // text check on page
\`\`\`

STRICT RULES:
1. NEVER use dynamic import() — static imports at the top only
2. ONLY import what the spec actually uses — no unused imports
3. NEVER use loginPage.page, inventoryPage.page etc. — use the page fixture parameter instead
4. NEVER use expect(page).toContainText() — page is not a locator
5. Use expect(page).toHaveURL() for URL assertions after navigation
6. Use expect(locator).toContainText() only on locators, not on page
7. Group tests with test.describe(), use nested describe for sub-sections
8. Cover: happy path + negative scenarios + edge cases
9. Use ShippingInfoBuilder for all checkout data — never hardcode names
10. Prefer healed methods for main user interactions (login, addToCart, checkout, finish)
11. Test names in English
12. Return ONLY TypeScript code — no markdown fences, no explanation
13. Start immediately with import lines
`.trim()

export function buildGeneratePrompt(feature: FeatureKey, description: string): string {
  return `${SYSTEM_CONTEXT}

Write a complete spec file for the feature: ${feature}

FEATURE DESCRIPTION:
${description}

Remember:
- Only import what this spec actually needs
- Use page fixture for URL assertions, not Page Object properties
- Do not call toContainText() on the page object itself
- Do not invent non-existent methods or locators`
}