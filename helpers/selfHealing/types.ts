/**
 * Type definitions for self-healing module
 * (без дублирования Groq типов)
 */

export type HealMethod = 'ai' | 'fallback'

export type HealResult = {
    healed: boolean
    locator: Locator
    newSelector: string | null
    originalSelector?: string
    method?: HealMethod | null
}

export type HealingConfig = {
    timeout?: number
    maxRetries?: number
    fallbackToText?: boolean
    logHealing?: boolean
    // Populated by the `heal` fixture from Playwright's testInfo — used to
    // attribute a healing event to a specific test in the summary report.
    testTitle?: string
    testFile?: string
}

// Playwright types (loose for compatibility)
export type Page = any
export type Locator = any

// Re-export Groq types for convenience
export type { GroqResponse, GroqOptions } from '../groq/types'