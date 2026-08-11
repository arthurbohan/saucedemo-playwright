/**
 * Self-healing module - Public API
 */

import { heal } from './core'
import type { HealingConfig, HealResult } from './types'

export type { HealResult, HealingConfig }
export type { GroqResponse, GroqOptions } from '../groq/types'

export async function getHealed(
    page: any,
    locator: any,
    description: string,
    config?: HealingConfig
): Promise<any> {
    const result = await heal(page, locator, description, config)
    return result.locator
}

export async function isLocatorValid(locator: any, timeout = 1000): Promise<boolean> {
    try {
        await locator.waitFor({ state: 'visible', timeout })
        return true
    } catch {
        return false
    }
}

export { heal }

export default {
    heal,
    getHealed,
    isLocatorValid,
}