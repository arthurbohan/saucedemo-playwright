/**
 * Core self-healing logic
 */

import type { Page, Locator, HealingConfig, HealResult } from './types'
import { CONFIG } from './config'
import { getPageSnapshot, getInteractiveElements } from './snapshot'
import { isValidPlaywrightSelector, sanitizeSelector } from './validation'
import { getGroqClient } from '../groq/client'
import { buildSelfHealingPrompt, buildSelfHealingRetryPrompt } from '../groq/prompts'
import { generateFallbackSelector } from './fallback'

export async function heal(
    page: Page,
    locator: Locator,
    description: string,
    config: HealingConfig = {}
): Promise<HealResult> {
    const {
        timeout = CONFIG.DEFAULT_TIMEOUT,
        maxRetries = CONFIG.DEFAULT_MAX_RETRIES,
        fallbackToText = true,
        logHealing = true,
    } = config

    let originalSelector: string
    try {
        originalSelector = locator.toString()
    } catch {
        originalSelector = 'unknown'
    }

    const isVisible = await locator
        .waitFor({ state: 'visible', timeout })
        .then(() => true)
        .catch(() => false)

    if (isVisible) {
        return { healed: false, locator, newSelector: null, originalSelector }
    }

    if (logHealing) {
        console.warn(`\n⚠️  [Self-Healing] Locator failed for: "${description}"`)
        console.warn(`   Original selector: ${originalSelector}`)
        console.warn('   Requesting alternative from Groq...')
    }

    let groqClient
    try {
        groqClient = getGroqClient()
    } catch (error) {
        console.warn(`   ❌ Failed to initialize Groq client: ${error}`)
        return { healed: false, locator, newSelector: null, originalSelector }
    }

    const snapshotText = await getPageSnapshot(page)
    const interactiveElements = await getInteractiveElements(page)

    let newSelector: string | null = null
    let attempts = 0

    while (attempts < maxRetries && !newSelector) {
        attempts++
        try {
            const prompt = buildSelfHealingPrompt(
                description,
                snapshotText,
                interactiveElements
            )

            const response = await groqClient.ask(
                prompt,
                'You are a Playwright locator expert. Return only the selector. No explanation.',
                {
                    maxTokens: 300,
                    temperature: 0.1,
                    // own model + own TPM budget, separate from the CLI scripts — see CONFIG.GROQ_MODEL
                    model: CONFIG.GROQ_MODEL,
                    // this runs inside a live Playwright test (~30s timeout) — a 429
                    // here should fail straight to the local fallback selector below,
                    // not burn the test's time budget waiting on Groq
                    retryAttempts: 1,
                }
            )

            const sanitized = sanitizeSelector(response.trim())

            if (isValidPlaywrightSelector(sanitized)) {
                newSelector = sanitized
                if (logHealing) {
                    console.warn(`   ✅ Healed locator: ${newSelector}`)
                }
            } else {
                console.warn(
                    `   ⚠️  Invalid selector from Groq (attempt ${attempts}/${maxRetries}): ${sanitized}`
                )

                if (attempts < maxRetries) {
                    const retryPrompt = buildSelfHealingRetryPrompt(
                        description,
                        sanitized,
                        'Invalid Playwright selector format'
                    )
                    console.warn(`   🔄 Retrying with corrected prompt...`)
                }
            }
        } catch (error) {
            // Don't throw here — a Groq error (network blip, rate limit) should
            // degrade to the fallback selector below, same as an invalid
            // selector does. heal() only gives up (returns healed: false) once
            // every option, including the fallback, is exhausted.
            console.warn(`   ❌ Groq API error (attempt ${attempts}/${maxRetries}): ${error}`)
        }
    }

    if (newSelector && isValidPlaywrightSelector(newSelector)) {
        try {
            const healedLocator = page.locator(newSelector)
            const isValid = await healedLocator
                .waitFor({ state: 'visible', timeout: 2000 })
                .then(() => true)
                .catch(() => false)

            if (isValid) {
                if (logHealing) {
                    console.warn('   ⚠️  Update your Page Object to fix this permanently!\n')
                }
                return {
                    healed: true,
                    locator: healedLocator,
                    newSelector,
                    originalSelector,
                }
            } else {
                console.warn(`   ⚠️  Healed locator not visible: ${newSelector}`)
                newSelector = null
            }
        } catch {
            console.warn(`   ⚠️  Healed locator invalid: ${newSelector}`)
            newSelector = null
        }
    }

    if (fallbackToText && !newSelector) {
        console.warn('   🔄 Trying fallback selector generation...')
        const fallbackSelector = await generateFallbackSelector(page, description, locator)
        if (fallbackSelector) {
            try {
                const fallbackLocator = page.locator(fallbackSelector)
                const count = await fallbackLocator.count()
                if (count > 0) {
                    console.warn(`   ✅ Using fallback selector: ${fallbackSelector}`)
                    console.warn('   ⚠️  Update your Page Object to fix this permanently!\n')
                    return {
                        healed: true,
                        locator: fallbackLocator,
                        newSelector: fallbackSelector,
                        originalSelector,
                    }
                }
            } catch {
                // Fallback failed
            }
        }
    }

    console.warn(`   ❌ Failed to heal locator. Using original: ${originalSelector}\n`)
    return {
        healed: false,
        locator,
        newSelector: null,
        originalSelector,
    }
}