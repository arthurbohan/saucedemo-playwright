/**
 * Self-healing module - Public API
 */

import { heal } from './core'
import type { HealingConfig } from './types'

export type { HealResult, HealingConfig, HealMethod } from './types'
export type { GroqResponse, GroqOptions } from '../groq/types'

export { logHealingEvent, readHealingLog, readHealingLogsFromFiles } from './log'
export type { HealingLogEntry } from './log'
export { saveHealingSummary } from './reporter'

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