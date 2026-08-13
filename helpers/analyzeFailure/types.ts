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
}

export type GroqClient = {
    ask: (prompt: string, systemPrompt: string, options?: any) => Promise<string>
}

export type CacheEntry = {
    analysis: string
    timestamp: number
    testHash: string
}