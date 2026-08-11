/**
 * Type definitions for self-healing module
 * (без дублирования Groq типов)
 */

export type HealResult = {
    healed: boolean
    locator: Locator
    newSelector: string | null
    originalSelector?: string
}

export type HealingConfig = {
    timeout?: number
    maxRetries?: number
    fallbackToText?: boolean
    logHealing?: boolean
}

// Playwright types (loose for compatibility)
export type Page = any
export type Locator = any

// Re-export Groq types for convenience
export type { GroqResponse, GroqOptions } from '../groq/types'