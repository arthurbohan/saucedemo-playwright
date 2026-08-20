/**
 * Prompts for AI test generation (scripts/generateTests.ts)
 *
 * Two domains, two system contexts: UI specs need Page Object/fixture rules,
 * API specs need apiClient/response-shape rules — mixing them into one prompt
 * just adds irrelevant noise for whichever domain isn't being generated.
 */

import type { FeatureKey } from '../../generateTests/types'
import { API_FEATURES } from '../../generateTests/types'

export const GENERATE_TESTS_SYSTEM =
    'You are a QA automation engineer. Return only TypeScript code. No explanation, no markdown. No semicolons at the end of statements — this project\'s house style omits them.'

const SYSTEM_CONTEXT_UI = `
You are an expert QA automation engineer. Write Playwright tests in TypeScript.

PROJECT ARCHITECTURE:
\`\`\`
tests/
├── specs/
│   ├── features/   ← E2E tests (target folder), imports use '../../xxx'
│   └── api/
├── fixtures/
│   └── index.ts        ← export { test, expect }
├── pages/
│   ├── basePage.ts
│   ├── loginPage.ts
│   ├── inventoryPage.ts
│   ├── cartPage.ts
│   ├── checkoutPage.ts
│   └── index.ts         ← barrel: re-exports every page class AND every type
├── builders/
│   ├── shippingInfo.builder.ts
│   └── index.ts         ← barrel
└── types/
    └── api.types.ts
\`\`\`

IMPORTS — USE ONLY WHAT THE SPEC ACTUALLY NEEDS.
Always import from the BARREL ('../../pages', '../../builders'), never from a
specific file inside pages/ or builders/ — even for types:
\`\`\`typescript
import { test, expect }           from '../../fixtures'
import { ShippingInfoBuilder }    from '../../builders'   // only in checkout spec
import { CartPage, CheckoutPage } from '../../pages'      // only in E2E flow tests
import type { ShippingInfo }      from '../../pages'      // only in checkout spec — NOT '../../pages/checkoutPage'
import type { ProductSlug }       from '../../pages'      // only in inventory spec — NOT '../../pages/inventoryPage'
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
            .addToCartBtn(slug), .removeBtn(slug)
            .itemByName(name) → Locator for the WHOLE .inventory_item card
              (image + name + description + price + button) — its innerText()
              contains all of that, not just the product name. To assert just
              the name, use .getItemNames() (below) and check the array/index.
  Methods:  .goto(), .addToCart(slug), .removeFromCart(slug)
            .sortBy(option), .goToCart(), .openBurgerMenu(), .logout()
            .getItemNames() → Promise<string[]>
            .getItemPrices() → Promise<number[]>  (already parsed floats, e.g. 29.99 — NOT "$29.99")
            .getCartCount() → Promise<number>
            .addToCartHealed(slug), .removeFromCartHealed(slug)
            .sortByHealed(option), .goToCartHealed()

  ⚠️ .logout() already calls openBurgerMenu() internally before clicking
  Logout — it is a complete action, not just the click. Never call
  .openBurgerMenu() yourself right before .logout(): the burger icon is a
  toggle, so opening it twice closes the menu again mid-click and the test
  times out waiting for an element that just slid out of view. Only call
  .openBurgerMenu() on its own when the test's purpose IS verifying the menu
  opens (assert .openedBurgerMenu is visible) and it does NOT then log out.

CartPage:
  Locators: .cartItems, .itemNames, .itemPrices, .itemQuantities
            .checkoutButton, .continueShoppingButton, .removeItemBtn(name)
            (.itemNames and .itemPrices are Locator getters — no parens, no await;
             for the resolved string[]/number[] use the methods below instead)
  Methods:  .goto(), .getItemCount() → Promise<number>
            .getItemNames() → Promise<string[]>
            .getItemPrices() → Promise<number[]>  (parsed floats, e.g. 29.99 — NOT "$29.99")
            .removeItem(name), .checkout(), .continueShopping(), .isEmpty() → Promise<boolean>
            .checkoutHealed(), .continueShoppingHealed()

CheckoutPage:
  Locators: .firstNameInput, .lastNameInput, .postalCodeInput
            .continueButton, .cancelButton, .errorMessage
            (.cancelButton on the step-two review page navigates to
             /inventory.html, NOT /cart.html — do not assume otherwise)
            .summaryItems, .summarySubtotal, .summaryTax, .summaryTotal
            .finishButton, .successHeader, .successText, .backHomeButton
  Methods:  .goto(), .fillShippingInfo(info)
            .getSummaryTotal() → Promise<number>  (parsed float, e.g. 32.42 — NOT "Total: $32.42";
              for the raw label text use .getTextOf(checkoutPage.summaryTotal) instead)
            .finish(), .isOrderComplete() → Promise<boolean>, .backToProducts()
            .fillShippingInfoHealed(info), .getSummaryTotalHealed() → Promise<number>  (same as above)
            .finishHealed(), .backToProductsHealed()
            .getTextOf(locator) → Promise<string>   ← from BasePage, use for raw label text

  ⚠️ fillShippingInfo(info) / fillShippingInfoHealed(info) fill ALL THREE
  fields, click continueButton, AND wait for navigation to step-two — it is
  a complete action, not just a fill. Never call .continueButton.click()
  again after it (double-click bug). And NEVER use it for a validation-error
  test: with an empty field there is no navigation to step-two, so the
  internal waitForURL() will hang until the test times out.

  For validation-error / empty-field scenarios, fill each input yourself and
  click continueButton once:
  \`\`\`typescript
  const data = new ShippingInfoBuilder().withEmptyFirstName().build()
  await checkoutPage.firstNameInput.fill(data.firstName)
  await checkoutPage.lastNameInput.fill(data.lastName)
  await checkoutPage.postalCodeInput.fill(data.postalCode)
  await checkoutPage.continueButton.click()
  await expect(checkoutPage.errorMessage).toContainText('First Name is required')
  \`\`\`

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
14. Locator getters (no parentheses in their definition, e.g. \`get itemNames()\`) are accessed as properties — never call them like a function (❌ \`cartPage.itemNames()\`, ✅ \`cartPage.itemNames\`)
15. Always import types (SauceUser, ShippingInfo, ProductSlug, SortOption) from the barrel '../../pages', never from a specific page file
16. Several Page Object methods are COMPOSITE — they already perform a full multi-step action end-to-end (e.g. fillShippingInfo/fillShippingInfoHealed fill+submit+wait for navigation; logout() opens the burger menu then clicks Logout). Read each method's one-line behavior below before calling it, and never manually repeat a sub-step (a click, a menu toggle, a wait) that the method you're calling already does internally
17. Don't add an \`as Type\` cast when passing a string literal to a parameter already typed as that union (e.g. \`loginAsHealed('standard_user')\` needs no cast and no SauceUser import at all — TS infers it) — only import a type when you actually declare a variable with it
18. NO SEMICOLONS anywhere — this project's house style (eslint \`semi: ['error', 'never']\`) omits them at the end of every statement, same as every hand-written spec in this repo
`.trim()

const SYSTEM_CONTEXT_API = `
You are an expert QA automation engineer. Write Playwright API tests in TypeScript.

PROJECT ARCHITECTURE (API tests only — no browser, no Page Objects):
\`\`\`
tests/
├── specs/api/          ← target folder, imports use '../../xxx'
├── fixtures/
│   └── index.ts            ← export { test, expect }
├── builders/
│   ├── post.builder.ts
│   └── index.ts             ← barrel
└── types/
    └── api.types.ts         ← Post, Comment, User, Todo
\`\`\`

IMPORTS — USE ONLY WHAT THE SPEC ACTUALLY NEEDS:
\`\`\`typescript
import { test, expect }              from '../../fixtures'
import { PostBuilder }               from '../../builders'
import type { Post, Comment, User, Todo } from '../../types/api.types'
\`\`\`

FIXTURE — apiClient (from the \`apiClient\` fixture, NOT a raw Playwright APIRequestContext):
\`\`\`typescript
apiClient.get(path: string)
apiClient.post(path: string, data?: unknown)
apiClient.put(path: string, data?: unknown)
apiClient.patch(path: string, data?: unknown)
apiClient.delete(path: string)
// each returns Playwright's APIResponse — use res.status(), res.ok(), await res.json()
\`\`\`

⚠️ Paths must NOT start with a leading slash — baseURL already ends with '/'.
Use \`'posts'\`, NOT \`'/posts'\` (a leading slash silently breaks the resolved URL).

PostBuilder (faker-backed, userId/title/body — all optional overrides):
\`\`\`typescript
new PostBuilder().build()
new PostBuilder().withUserId(1).build()
new PostBuilder().withTitle('...').build()
new PostBuilder().withBody('...').build()
\`\`\`

ASSERTIONS — CORRECT USAGE:
\`\`\`typescript
const res = await apiClient.get('posts/1')
expect(res.status()).toBe(200)          // exact status
expect(res.ok()).toBeTruthy()           // 2xx shortcut
const post = await res.json() as Post   // cast the parsed body to a type
expect(post.id).toBe(1)
\`\`\`

STRICT RULES:
1. NEVER use dynamic import() — static imports at the top only
2. ONLY import what the spec actually uses — no unused imports
3. Never call a resource path with a leading slash ('posts', not '/posts')
4. Test names in English
5. Group tests with test.describe() per resource or per HTTP method group
6. Cover: happy path, a 404/not-found case, filtering by query param where relevant, and at least one multi-step chain (e.g. create → get → update → delete)
7. Remember write operations (POST/PUT/PATCH/DELETE) are simulated by jsonplaceholder — assert on the response status/shape it returns, never assume the change persists across a later GET
8. Return ONLY TypeScript code — no markdown fences, no explanation
9. Start immediately with import lines
10. NO SEMICOLONS anywhere — this project's house style (eslint \`semi: ['error', 'never']\`) omits them at the end of every statement
`.trim()

export function buildGeneratePrompt(feature: FeatureKey, description: string): string {
    const systemContext = (API_FEATURES as readonly string[]).includes(feature)
        ? SYSTEM_CONTEXT_API
        : SYSTEM_CONTEXT_UI

    return `${systemContext}

Write a complete spec file for the feature: ${feature}

FEATURE DESCRIPTION:
${description}

Remember:
- Only import what this spec actually needs
- Do not invent non-existent methods, fixtures, or fields`
}

// Feeds scripts/generateTests.ts's fix-and-retry loop — a generation that
// typechecks clean on the first attempt never reaches this. Deliberately
// scoped to "fix these specific errors," not "regenerate from scratch":
// most of the file is already correct, and a fresh generation risks
// introducing a new, different mistake instead of just fixing this one.
export function buildFixTestPrompt(code: string, tscErrors: string): string {
    return `
The Playwright spec below was generated for this project but has TypeScript
errors. Fix ONLY what the errors below require — do not rewrite parts of the
file the errors don't mention, and do not change test behavior otherwise.

GENERATED CODE:
${code}

TYPESCRIPT ERRORS:
${tscErrors}

Return the complete corrected file. No markdown fences, no explanation —
start immediately with the import lines.`.trim()
}
