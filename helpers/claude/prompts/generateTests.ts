/**
 * Prompts for AI test generation (scripts/generateTests.ts)
 *
 * Deliberately identical in content to
 * ../../groq/prompts/generateTests.ts — the prompt engineering (project
 * architecture, import rules, house style) isn't provider-specific, only
 * the client that sends it is. Kept as its own copy rather than a shared
 * import so helpers/claude/ stays a self-contained module, same shape as
 * helpers/groq/ — see helpers/claude/prompts/failureAnalysis.ts for the
 * same reasoning applied there first.
 */

import fs from 'fs'
import path from 'path'
import type { FeatureKey } from '../../generateTests/types'
import { API_FEATURES } from '../../generateTests/types'

const PAGE_OBJECT_FILES_BY_UI_FEATURE: Record<string, string[]> = {
    login: ['tests/pages/basePage.ts', 'tests/pages/loginPage.ts'],
    inventory: ['tests/pages/basePage.ts', 'tests/pages/inventoryPage.ts'],
    checkout: [
        'tests/pages/basePage.ts',
        'tests/pages/checkoutPage.ts',
        'tests/pages/cartPage.ts',
        'tests/builders/shippingInfo.builder.ts',
    ],
}

function readPageObjectSource(feature: FeatureKey): string {
    const files = PAGE_OBJECT_FILES_BY_UI_FEATURE[feature] ?? []

    return files
        .map(relativePath => {
            const content = fs.readFileSync(path.join(process.cwd(), relativePath), 'utf-8')
            return `// ─── ${relativePath} ───\n${content.trim()}`
        })
        .join('\n\n')
}

export const GENERATE_TESTS_SYSTEM =
    'You are a QA automation engineer. Return only TypeScript code. No explanation, no markdown. No semicolons at the end of statements — this project\'s house style omits them.'

function buildSystemContextUI(feature: FeatureKey): string {
    return `
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

PAGE OBJECT SOURCE — this is the real, current code, not a paraphrase. Every
locator, every method signature, every JSDoc warning above a method (read
those — they call out composite methods and other easy mistakes) is exactly
what exists right now. Do not call anything not shown here.

${readPageObjectSource(feature)}
${feature === 'checkout' ? `
For validation-error / empty-field scenarios on CheckoutPage, fill each
input yourself and click continueButton once instead of calling
fillShippingInfo (see its JSDoc above for why):
\`\`\`typescript
const data = new ShippingInfoBuilder().withEmptyFirstName().build()
await checkoutPage.firstNameInput.fill(data.firstName)
await checkoutPage.lastNameInput.fill(data.lastName)
await checkoutPage.postalCodeInput.fill(data.postalCode)
await checkoutPage.continueButton.click()
await expect(checkoutPage.errorMessage).toContainText('First Name is required')
\`\`\`` : ''}

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
14. A \`get x()\` in the source above is a getter, not a method — access it as \`cartPage.x\`, never \`cartPage.x()\`
15. Always import types (SauceUser, ShippingInfo, ProductSlug, SortOption) from the barrel '../../pages', never from a specific page file
16. Some Page Object methods are COMPOSITE (their JSDoc says so) — they already perform a full multi-step action end-to-end. Read a method's JSDoc before calling it, and never manually repeat a sub-step it already does internally
17. Don't add an \`as Type\` cast when passing a string literal to a parameter already typed as that union (e.g. \`loginAsHealed('standard_user')\` needs no cast and no SauceUser import at all — TS infers it) — only import a type when you actually declare a variable with it
18. NO SEMICOLONS anywhere — this project's house style (eslint \`semi: ['error', 'never']\`) omits them at the end of every statement, same as every hand-written spec in this repo
19. Only destructure the fixtures a test actually uses in its body (e.g. \`{ checkoutPage, cartPage, page }\`) — an unused one isn't just dead code here, fixtures like cartPage/checkoutPage NAVIGATE during setup, so requesting one you don't need can leave the page on the wrong URL before your test even starts
20. If a composite method's JSDoc says it already performs some step internally (opening a menu, submitting a form, etc.), never perform that same step yourself right before calling it — for a toggle (like the burger menu), doing so undoes it instead of being harmless. If a test's whole point is verifying that intermediate step on its own (e.g. "menu opens"), write it as its own separate test that does NOT also then call the composite method
`.trim()
}

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
        : buildSystemContextUI(feature)

    return `${systemContext}

Write a complete spec file for the feature: ${feature}

FEATURE DESCRIPTION:
${description}

Remember:
- Only import what this spec actually needs
- Do not invent non-existent methods, fixtures, or fields`
}

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
