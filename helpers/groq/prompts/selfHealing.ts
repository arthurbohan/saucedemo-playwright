/**
 * Prompts for self-healing functionality
 */

export const SELF_HEALING_SYSTEM = `
You are a Playwright test automation expert specializing in selector generation.
Your task is to generate reliable, maintainable Playwright selectors.
Return ONLY the selector string - no explanation, no code block markers, no backticks.
`.trim()

export function buildSelfHealingPrompt(
    description: string,
    snapshot: string,
    interactiveElements: string,
    elementType?: string
): string {
    return `
You are a Playwright test automation expert.

A test is trying to find this element: "${description}"

The original locator no longer works.

Page snapshot:
${snapshot.slice(0, 6000)}

Interactive elements on page:
${interactiveElements}

Based on the above information, provide a single Playwright locator that would find this element.

CRITICAL RULES:
1. Return ONLY the selector string, nothing else
2. NO backticks, NO explanation, NO code block markers
3. MUST be a valid Playwright selector
4. Use ONLY these selector types:
   - data-testid: [data-testid="value"]
   - data-test: [data-test="value"]
   - aria-label: [aria-label="value"]
   - role: role=button[name="Add to cart"]
   - text: text="Add to cart"
   - CSS class: .btn-inventory
   - ID: #add-to-cart
   - XPath: //button[contains(@data-test, "add-to-cart")]
5. NEVER use these (not supported in Playwright):
   - :near() pseudo-class
   - :has() pseudo-class
   - combobox[role="listbox"] (use role=listbox or select)
6. Prefer stable attributes: data-testid, data-test, aria-label
7. For roles, use exact format: role=button[name="Exact name"]
8. If the element is a button, prefer button or role=button

Valid examples:
✅ [data-testid="add-to-cart-sauce-labs-backpack"]
✅ button[aria-label="Add Sauce Labs Backpack to cart"]
✅ .btn_inventory
✅ role=button[name="Add to cart"]
✅ text="Sauce Labs Backpack"
✅ //button[contains(@data-test, "add-to-cart")]

INVALID examples (DO NOT USE):
❌ button:has-text("Add"):near("Backpack")
❌ combobox[role="listbox"]
❌ button:has-text("Add to cart")

${elementType ? `Element type detected: ${elementType}` : ''}

Return ONLY the selector string:`
}

export function buildSelfHealingRetryPrompt(
    description: string,
    invalidSelector: string,
    error: string
): string {
    return `
The previous selector "${invalidSelector}" is invalid for Playwright.

Error: ${error}

Please provide a corrected Playwright selector for: "${description}"

Rules:
1. Use ONLY: data-testid, data-test, aria-label, role=, text=, CSS, XPath
2. NEVER use: :near(), :has(), combobox[role]
3. Return ONLY the selector string

Valid examples:
✅ [data-testid="add-to-cart-sauce-labs-backpack"]
✅ role=button[name="Add to cart"]
✅ text="Sauce Labs Backpack"

Return ONLY the corrected selector:`
}