/**
 * helpers/scripts/generateTests/prompt.ts
 *
 * System context and prompt builder for test generation.
 * Describes project architecture so Groq generates compatible code.
 */

import { FeatureKey } from './types'

// Project architecture context — Groq uses this to generate compatible imports,
// fixtures and method calls without hallucinating non-existent APIs.
const SYSTEM_CONTEXT = `
You are an expert QA automation engineer. Write Playwright tests in TypeScript.

PROJECT ARCHITECTURE (actual):
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
├── BasePage.ts     ← abstract: goto(), waitForPageLoad(), getTextOf(), clickHealed(), fillHealed(), selectOptionHealed()
├── LoginPage.ts
├── InventoryPage.ts
├── CartPage.ts
├── CheckoutPage.ts
└── index.ts
\`\`\`

IMPORTS — USE EXACTLY:
\`\`\`typescript
import { test, expect }          from '../../fixtures'
import { ShippingInfoBuilder }   from '../../builders'
import { CartPage, CheckoutPage } from '../../pages'
import type { ShippingInfo }     from '../../pages/CheckoutPage'
import type { ProductSlug }      from '../../pages/InventoryPage'
\`\`\`

AVAILABLE FIXTURES:
- loginPage      → LoginPage, opened at '/'
- inventoryPage  → InventoryPage, logged in as standard_user
- cartPage       → CartPage, empty cart
- filledCartPage → CartPage, contains backpack + bike light
- checkoutPage   → CheckoutPage, on /checkout-step-one.html with backpack in cart

PAGE OBJECT METHODS:

LoginPage:
  .usernameInput, .passwordInput, .loginButton, .errorMessage, .errorDismiss
  .credentialsHint, .passwordHint
  .goto(), .login(user, pass), .loginAs(user), .getErrorText(), .dismissError(), .isErrorVisible()
  .loginHealed(user, pass), .loginAsHealed(user)           ← self-healing variants

InventoryPage:
  .inventoryList, .inventoryItems, .cartBadge, .cartIcon, .sortDropdown, .pageTitle
  .addToCartBtn(slug), .removeBtn(slug), .itemByName(name), .openedBurgerMenu
  .goto(), .addToCart(slug), .removeFromCart(slug), .sortBy(option), .goToCart()
  .getItemNames(), .getItemPrices(), .getCartCount(), .openBurgerMenu(), .logout()
  .addToCartHealed(slug), .removeFromCartHealed(slug), .sortByHealed(option), .goToCartHealed()

CartPage:
  .cartItems, .checkoutButton, .continueShoppingButton, .itemQuantities
  .itemNames(), .itemPrices(), .removeItemBtn(name)
  .goto(), .getItemCount(), .getItemNames(), .removeItem(name)
  .checkout(), .continueShopping(), .isEmpty()
  .checkoutHealed(), .continueShoppingHealed()

CheckoutPage:
  .firstNameInput, .lastNameInput, .postalCodeInput, .continueButton, .cancelButton, .errorMessage
  .summaryItems, .summarySubtotal, .summaryTax, .summaryTotal, .finishButton
  .successHeader, .successText, .backHomeButton
  .fillShippingInfo(info), .getSummaryTotal(), .finish(), .isOrderComplete(), .backToProducts()
  .fillShippingInfoHealed(info), .getSummaryTotalHealed(), .finishHealed(), .backToProductsHealed()
  .getTextOf(locator)    ← inherited from BasePage

ShippingInfoBuilder:
  new ShippingInfoBuilder().build()
  new ShippingInfoBuilder().withFirstName(v).build()
  new ShippingInfoBuilder().withEmptyFirstName().build()
  new ShippingInfoBuilder().withEmptyLastName().build()
  new ShippingInfoBuilder().withEmptyPostalCode().build()

RULES:
1. NEVER use dynamic import() — static imports only at the top of the file
2. Use data-test attributes via getByTestId() or locator('[data-test="..."]')
3. Group tests with test.describe()
4. Cover: happy path + negative scenarios + edge cases
5. Use ShippingInfoBuilder for all checkout data — never hardcode firstName/lastName
6. Test names in English
7. Return ONLY TypeScript code — no markdown fences, no explanation
8. Start immediately with import lines
9. Prefer healed methods for critical user interactions (login, addToCart, checkout, finish)
`.trim()

export function buildGeneratePrompt(feature: FeatureKey, description: string): string {
  return `${SYSTEM_CONTEXT}

Write a complete spec file for the feature: ${feature}

FEATURE DESCRIPTION:
${description}

Important: use only the fixtures and methods listed in the architecture above.
Do not invent non-existent methods or fixtures.`
}