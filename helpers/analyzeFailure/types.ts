/**
 * Types for analyzeFailure module
 */

export type FailureInfo = {
    filePath: string
    content: string
    testName: string
}

export type AnalysisResult = {
    testName: string
    analysis: string
    error?: string
}

export type AnalyzeConfig = {
    batchThreshold?: number
    batchMaxTokens?: number
    individualMaxTokens?: number
    temperature?: number
    delayBetweenRequests?: number
    outputDir?: string
    deduplicate?: boolean
    useCache?: boolean
    // Whether to ask for the plain-language "Manual Verdict" section aimed
    // at manual testers, on top of the always-present engineer-facing
    // Root Cause/Location/Fix/Code. On by default (full-regression.yml,
    // npm run regression); pr-checks.yml turns it off — see
    // scripts/analyzeFailure.ts's SKIP_MANUAL_VERDICT env var.
    includeManualVerdict?: boolean
}

export type GroqClient = {
    ask: (prompt: string, systemPrompt: string, options?: any) => Promise<string>
}

export type CacheEntry = {
    analysis: string
    timestamp: number
    testHash: string
}