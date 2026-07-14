import fs from 'fs'
import path from 'path'

import 'dotenv/config'

// ─── Types ────────────────────────────────────────────────────────────────────

type GeminiResponse = {
    candidates: Array<{
        content: {
            parts: Array<{ text: string }>
        }
    }>
    usageMetadata: {
        promptTokenCount: number
        candidatesTokenCount: number
    }
}

// ─── Feature Descriptions ────────────────────────────────────────────────────────

const FEATURE_DESCRIPTIONS = {

    login: `
    Login page saucedemo.com (URL: https://www.saucedemo.com):
    Locators via getByTestId():
      - username → data-test="username"
      - password → data-test="password"
      - login button → data-test="login-button"
      - error message → data-test="error"
      - error dismiss button → data-test="error-button"
      - credentials hint → #login_credentials
      - password hint → .login_password

    Test users (password for all: secret_sauce):
      - standard_user     — works correctly, redirect to /inventory.html
      - locked_out_user   — locked out, error "locked out"
      - problem_user      — UI bugs
      - performance_glitch_user — slow login (~5 sec)

    Error behavior:
      - empty username → "Epic sadface: Username is required"
      - empty password → "Epic sadface: Password is required"
      - invalid password → "Epic sadface: Username and password do not match"
  `,

    inventory: `
    Product catalog page (/inventory.html):
    Locators:
      - product list → .inventory_list
      - each product → .inventory_item (6 total)
      - product name → .inventory_item_name
      - product price → .inventory_item_price
      - cart badge → .shopping_cart_badge
      - cart icon → .shopping_cart_link
      - sorting → data-test="product-sort-container"
      - page title → .title
      - burger menu → #react-burger-menu-btn
      - open menu → .bm-menu-wrap
      - logout → data-test="logout-sidebar-link"

    Product buttons (by slug):
      - data-test="add-to-cart-{slug}"
      - data-test="remove-{slug}"

    Product slugs:
      sauce-labs-backpack, sauce-labs-bike-light, sauce-labs-bolt-t-shirt,
      sauce-labs-fleece-jacket, sauce-labs-onesie, test.allthethings()-t-shirt-(red)

    Sort options: az, za, lohi, hilo
    After addToCart, Add button changes to Remove
    goToCart() navigates to /cart.html
  `,

    checkout: `
    Checkout flow saucedemo.com:

    Step 1 (/checkout-step-one.html):
      - data-test="firstName"
      - data-test="lastName"
      - data-test="postalCode"
      - data-test="continue" → proceed to step 2 or error
      - data-test="cancel" → return to cart /cart.html
      - data-test="error" → error message
      Errors: "First Name is required", "Last Name is required", "Postal Code is required"

    Step 2 (/checkout-step-two.html):
      - .cart_item → list of products
      - .summary_subtotal_label → subtotal
      - .summary_tax_label → tax
      - .summary_total_label → total (format "Total: $X.XX")
      - data-test="finish" → complete order

    Step 3 (/checkout-complete.html):
      - .complete-header = "Thank you for your order!"
      - .complete-text → description
      - data-test="back-to-products" → return to catalog
  `,

} as const

type FeatureKey = keyof typeof FEATURE_DESCRIPTIONS

// ─── System prompt with project architecture ─────────────────────────────────

const SYSTEM_CONTEXT = `You are an experienced QA automation engineer. Write Playwright tests in TypeScript.

PROJECT ARCHITECTURE:
\`\`\`
tests/
├── specs/
│   ├── features/   ← E2E tests (use this folder)
│   └── api/        ← API tests
├── builders/
│   ├── ShippingInfoBuilder.ts  ← for checkout data
│   └── index.ts
├── types/
│   └── api.types.ts
├── fixtures/
│    └── index.ts        ← export { test, expect }
└── pages/             ← Page Objects
    ├── LoginPage.ts
    ├── InventoryPage.ts
    ├── CartPage.ts
    ├── CheckoutPage.ts
    └── index.ts
\`\`\`

IMPORTS — STRICTLY THIS WAY:
\`\`\`typescript
import { test, expect }       from '../../fixtures'
import { ShippingInfoBuilder } from '../../builders'
import { CartPage, CheckoutPage } from '../../pages'    // статический импорт, НЕ dynamic import()
import type { ShippingInfo }  from '../../pages/CheckoutPage'
import type { ProductSlug }   from '../../pages/InventoryPage'
\`\`\`

AVAILABLE FIXTURES (destructure from test parameters):
- loginPage      → LoginPage instance, opened on '/'
- inventoryPage  → InventoryPage instance, logged in as standard_user
- cartPage       → CartPage instance, empty cart
- filledCartPage → CartPage instance, with backpack + bike light
- checkoutPage   → CheckoutPage instance, at /checkout-step-one.html with backpack

AVAILABLE PAGE OBJECT METHODS:

LoginPage:
  loginPage.usernameInput, passwordInput, loginButton, errorMessage, errorDismiss
  loginPage.goto(), login(user, pass), loginAs(user), getErrorText(), dismissError(), isErrorVisible()

InventoryPage:
  inventoryPage.inventoryList, inventoryItems, cartBadge, cartIcon, sortDropdown, pageTitle
  inventoryPage.addToCartBtn(slug), removeBtn(slug), itemByName(name)
  inventoryPage.goto(), addToCart(slug), removeFromCart(slug), sortBy(option), goToCart()
  inventoryPage.getItemNames(), getItemPrices(), getCartCount(), openBurgerMenu(), logout()

CartPage:
  cartPage.cartItems, checkoutButton, continueShoppingButton
  cartPage.itemNames(), itemPrices(), removeItemBtn(name)
  cartPage.goto(), getItemCount(), getItemNames(), removeItem(name), checkout(), continueShopping(), isEmpty()

CheckoutPage:
  checkoutPage.firstNameInput, lastNameInput, postalCodeInput, continueButton, cancelButton, errorMessage
  checkoutPage.summaryItems, summarySubtotal, summaryTax, summaryTotal, finishButton
  checkoutPage.successHeader, successText, backHomeButton
  checkoutPage.fillShippingInfo(info), getSummaryTotal(), finish(), isOrderComplete(), backToProducts()
  checkoutPage.getTextOf(locator)  ← из BasePage

ShippingInfoBuilder:
  new ShippingInfoBuilder().build()
  new ShippingInfoBuilder().withFirstName(v).withEmptyLastName().build()

RULES:
1. NEVER use dynamic import() — only static imports at the top of the file
2. Use data-test attributes via getByTestId() or locator('[data-test="..."')
3. Group tests via test.describe()
4. Cover happy path + negative scenarios
5. Use ShippingInfoBuilder for checkout data — DO NOT hardcode firstName/lastName
6. Tests in English, comments in English
7. Return ONLY TypeScript code — without markdown blocks, without explanations
8. Start immediately with import lines`

// ─── Generate via Gemini API ───────────────────────────────────────────────

async function generateWithGemini(
    feature: FeatureKey,
    description: string
): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
        throw new Error(
            'GEMINI_API_KEY is not set.\n' +
            'Add to .env: GEMINI_API_KEY=AIza...\n' +
            'Get key from: aistudio.google.com'
        )
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`

    const prompt = `${SYSTEM_CONTEXT}

Write a complete spec file for feature: ${feature}

FEATURE DESCRIPTION:
${description}

Important: use available fixtures and methods from the architecture above.
Do not invent non-existent methods or fixtures.`

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.1,   // minimal — strictly follow instructions
                maxOutputTokens: 8192,  // sufficient for complete spec file
            }
        }),
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Gemini API error ${response.status}: ${error}`)
    }

    const data = await response.json() as GeminiResponse

    console.log(
        `  📊 Tokens: input=${data.usageMetadata.promptTokenCount}, ` +
        `output=${data.usageMetadata.candidatesTokenCount}`
    )

    return data.candidates[0].content.parts[0].text
}

// ─── Save generated code ────────────────────────────────────────

function saveGeneratedSpec(feature: string, code: string): string {
    const outputDir = path.join(
        process.cwd(), 'tests', 'specs', 'generated'
    )

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
        console.log(`  📁 Folder created: ${outputDir}`)
    }

    // Remove markdown blocks if Gemini added them anyway
    const cleanCode = code
        .replace(/^```typescript\n?/m, '')
        .replace(/^```ts\n?/m, '')
        .replace(/^```\n?/m, '')
        .replace(/```$/m, '')
        .trim()

    const filePath = path.join(outputDir, `${feature}.generated.spec.ts`)
    fs.writeFileSync(filePath, cleanCode, 'utf-8')
    return filePath
}

// ─── Main logic ──────────────────────────────────────────────────────────

async function main() {
    const featureArg = process.argv[2] as FeatureKey | undefined

    const featuresToGenerate: FeatureKey[] = featureArg
        ? [featureArg]
        : (Object.keys(FEATURE_DESCRIPTIONS) as FeatureKey[])

    if (featureArg && !FEATURE_DESCRIPTIONS[featureArg]) {
        console.error(`❌ Unknown feature: "${featureArg}"`)
        console.error(`   Available: ${Object.keys(FEATURE_DESCRIPTIONS).join(', ')}`)
        process.exit(1)
    }

    console.log(`🤖 Generating tests via Gemini for: ${featuresToGenerate.join(', ')}\n`)

    for (const feature of featuresToGenerate) {
        console.log('─'.repeat(60))
        console.log(`📝 Feature: ${feature}`)
        console.log('🔄 Sending to Gemini...')

        try {
            const code = await generateWithGemini(feature, FEATURE_DESCRIPTIONS[feature])
            const filePath = saveGeneratedSpec(feature, code)

            console.log(`✅ Saved: ${filePath}`)
            console.log('\n--- Preview (first 8 lines) ---')
            console.log(code.split('\n').slice(0, 8).join('\n'))
            console.log('...\n')

        } catch (err) {
            console.error(`❌ Error for "${feature}": ${err}`)
        }

        // Pause between requests
        if (featuresToGenerate.indexOf(feature) < featuresToGenerate.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 5000))
        }
    }

    console.log('─'.repeat(60))
    console.log('✅ Generation complete')
    console.log('\n⚠️  Review the generated code before running:')
    console.log('   tests/specs/generated/')
}

main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})