/**
 * Configuration for analyzeFailure
 */

import type { AnalyzeConfig } from './types'

export const DEFAULT_CONFIG: Required<AnalyzeConfig> = {
    batchThreshold: 5,
    batchMaxTokens: 2048,
    individualMaxTokens: 1024,
    temperature: 0.1,
    delayBetweenRequests: 2000,
    outputDir: process.cwd(),
    deduplicate: true,
    useCache: true,
}

export const SYSTEM_PROMPTS = {
    BATCH: 'You are a QA automation engineer. Analyze multiple test failures.',
    INDIVIDUAL: 'You are a QA automation engineer. Be concise and precise.',
} as const

export const CACHE_CONFIG = {
    MAX_AGE_DAYS: 7,
    CACHE_DIR: 'test-results/analysis-cache',
    CACHE_FILE: 'analysis-cache.json',
} as const