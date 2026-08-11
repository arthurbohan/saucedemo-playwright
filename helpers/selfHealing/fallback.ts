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

        const fallbacks = [
            `button[aria-label*="${productName}"]`,
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