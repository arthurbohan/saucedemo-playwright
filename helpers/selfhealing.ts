/**
 * helpers/selfHealing.ts
 *
 * Core self-healing logic.
 * When a locator fails to find an element, this helper:
 *   1. Takes an accessibility snapshot of the page (DOM as text)
 *   2. Sends it to Groq API with a description of the element
 *   3. Gets back a new working locator
 *   4. Logs a warning so you know healing happened
 */

import { Page, Locator } from '@playwright/test'
import 'dotenv/config'

// ─── Types ────────────────────────────────────────────────────────────────────

type GroqResponse = {
  choices: Array<{
    message: { content: string }
  }>
}

type HealResult = {
  healed:      boolean
  locator:     Locator
  newSelector: string | null
}

// ─── Config ───────────────────────────────────────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL   = 'llama-3.3-70b-versatile'

// How long to wait for the original locator before trying to heal (ms)
const LOCATOR_TIMEOUT = 3_000

// ─── Main heal function ───────────────────────────────────────────────────────

/**
 * Tries the original locator first.
 * If it fails, asks Groq to find an alternative selector.
 *
 * @param page        - Playwright Page instance
 * @param locator     - The original locator that may be broken
 * @param description - Human-readable description of the element
 *                      e.g. "Add to cart button for Sauce Labs Backpack"
 *
 * @example
 * const { locator } = await heal(
 *   page,
 *   page.getByTestId('add-to-cart-sauce-labs-backpack'),
 *   'Add to cart button for Sauce Labs Backpack'
 * )
 * await locator.click()
 */
export async function heal(
  page:        Page,
  locator:     Locator,
  description: string,
): Promise<HealResult> {

  // 1. Try the original locator first
  const isVisible = await locator
    .waitFor({ state: 'visible', timeout: LOCATOR_TIMEOUT })
    .then(() => true)
    .catch(() => false)

  if (isVisible) {
    // Original locator works — no healing needed
    return { healed: false, locator, newSelector: null }
  }

  // 2. Original locator failed — start healing
  console.warn(`\n⚠️  [Self-Healing] Locator failed for: "${description}"`)
  console.warn('   Requesting alternative from Groq...')

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error(
      '[Self-Healing] GROQ_API_KEY is not set. ' +
      'Get a free key at console.groq.com'
    )
  }

  // 3. Take accessibility snapshot of the page
  const snapshot = await page.ariaSnapshot({ mode: 'ai' })
  const snapshotText = JSON.stringify(snapshot, null, 2)

  // 4. Ask Groq for a new selector
  const prompt = `You are a Playwright test automation expert.

A test is trying to find this element: "${description}"

The original locator no longer works. The page accessibility snapshot is:
${snapshotText.slice(0, 8000)}

Based on the snapshot, provide a single Playwright locator that would find this element.

Rules:
- Return ONLY the selector string, nothing else
- No explanation, no code, no quotes
- Use the most stable selector available (prefer data-test, data-testid, aria-label, role)
- Examples of valid responses:
    [data-testid="add-to-cart-sauce-labs-backpack"]
    button[aria-label="Add Sauce Labs Backpack to cart"]
    .btn-inventory[id="add-to-cart-sauce-labs-backpack"]`

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:       GROQ_MODEL,
      temperature: 0,
      max_tokens:  100,
      messages: [
        {
          role:    'system',
          content: 'You are a Playwright locator expert. Return only the CSS selector or attribute selector. No explanation.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`[Self-Healing] Groq API error ${response.status}: ${error}`)
  }

  const data     = await response.json() as GroqResponse
  const rawSelector = data.choices[0].message.content.trim()

  // Clean up any wrapping quotes Groq might add
  const newSelector = rawSelector
    .replace(/^["'`]|["'`]$/g, '')
    .trim()

  console.warn(`   ✅ Healed locator: ${newSelector}`)
  console.warn('   ⚠️  Update your Page Object to fix this permanently!\n')

  // 5. Return the healed locator
  const healedLocator = page.locator(newSelector)

  return {
    healed:      true,
    locator:     healedLocator,
    newSelector,
  }
}

// ─── Convenience wrapper ──────────────────────────────────────────────────────

/**
 * Heals the locator and returns it directly (without the metadata).
 * Use this when you just want to interact with the element.
 *
 * @example
 * const btn = await getHealed(page, page.getByTestId('checkout'), 'Checkout button')
 * await btn.click()
 */
export async function getHealed(
  page:        Page,
  locator:     Locator,
  description: string,
): Promise<Locator> {
  const result = await heal(page, locator, description)
  return result.locator
}