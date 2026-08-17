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