/**
 * Fallback selector generation
 */

import type { Page, Locator } from './types'

export async function generateFallbackSelector(
    page: Page,
    description: string,
    originalLocator: Locator
): Promise<string | null> {
    console.warn(`   🔄 Generating fallback selector for: "${description}"`)

    const productMatch = description.match(/for\s+(.+?)(?:\s+button|$)/i)
    if (productMatch) {
        const productName = productMatch[1].trim()
        console.warn(`   📦 Extracted product: "${productName}"`)

        // A bare text match usually lands on the item's NAME (a non-interactive
        // label), not the actual button — clicking it does nothing. When the
        // description is asking for a button, look for one sharing the closest
        // card/container with that text before falling back to the text itself.
        if (/button/i.test(description)) {
            for (let depth = 1; depth <= 4; depth++) {
                const candidate = `(//*[normalize-space(text())="${productName}"]/ancestor::*[${depth}]//button)[1]`
                try {
                    const count = await page.locator(candidate).count()
                    if (count > 0) {
                        console.warn(`   ✅ Found button near "${productName}" (ancestor depth ${depth}): ${candidate}`)
                        return candidate
                    }
                } catch {
                    // Continue
                }
            }
        }

        const fallbacks = [
            `button[aria-label*="${productName}"]`,
            `[data-test*="${productName.toLowerCase().replace(/\s+/g, '-')}"]`,
            `[data-testid*="${productName.toLowerCase().replace(/\s+/g, '-')}"]`,
            `text="${productName}"`,
            `text=/.*${productName}.*/i`,
        ]

        for (const fallback of fallbacks) {
            try {
                const locator = page.locator(fallback)
                const count = await locator.count()
                if (count > 0) {
                    console.warn(`   ✅ Found element with fallback: ${fallback}`)
                    return fallback
                }
            } catch {
                // Continue
            }
        }
    }

    // Descriptions without a "for <product>" shape (e.g. "Shopping cart icon
    // link in the navigation bar") skip the block above entirely — they had
    // no fallback strategy at all before this. Try matching significant
    // words from the description against aria-label AND data-test(id) —
    // icon-only elements (like a cart link with no visible text) often carry
    // no aria-label at all, but do carry a semantic test id (e.g.
    // "shopping-cart-link" for a description containing "cart"). Require an
    // exact single match: an ambiguous fallback is worse than none, since
    // the caller clicks whatever locator comes back without disambiguating.
    const STOP_WORDS = new Set(['the', 'and', 'for', 'link', 'button', 'icon', 'field', 'input', 'menu'])
    const keywords = description
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.replace(/[^a-z0-9]/g, ''))
        .filter((w) => w.length > 3 && !STOP_WORDS.has(w))

    // Restricted to clickable tags — a bare attribute selector can pick up a
    // non-interactive child (e.g. a cart badge <span data-test="cart-badge">
    // nested inside the actual <a data-test="cart-link">), turning what
    // should be a unique match into an ambiguous one.
    const CLICKABLE = ['a', 'button', '[role="button"]', '[role="link"]']
    for (const word of keywords) {
        const candidates = [
            CLICKABLE.map((tag) => `${tag}[aria-label*="${word}" i]`).join(', '),
            CLICKABLE.map((tag) => `${tag}[data-test*="${word}" i]`).join(', '),
            CLICKABLE.map((tag) => `${tag}[data-testid*="${word}" i]`).join(', '),
        ]
        for (const candidate of candidates) {
            try {
                const count = await page.locator(candidate).count()
                if (count === 1) {
                    console.warn(`   ✅ Found element by keyword "${word}": ${candidate}`)
                    return candidate
                }
            } catch {
                // Continue
            }
        }
    }

    try {
        const originalSelector = originalLocator.toString()
        const textMatch = originalSelector.match(/text="([^"]+)"/)
        if (textMatch) {
            const text = textMatch[1]
            const fallback = `text="${text}"`
            const locator = page.locator(fallback)
            const count = await locator.count()
            if (count > 0) {
                console.warn(`   ✅ Found element with text fallback: ${fallback}`)
                return fallback
            }
        }
    } catch {
        // Ignore
    }

    return null
}