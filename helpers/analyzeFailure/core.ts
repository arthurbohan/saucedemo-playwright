/**
 * Core failure analysis logic
 */

import type { AnalysisResult, FailureInfo, AnalyzeConfig, AiClient, PromptBuilder } from './types'
import { DEFAULT_CONFIG, SYSTEM_PROMPTS } from './config'
import { getLogger } from './logger'
import { getCache } from './cache'

export class FailureAnalyzer {
    private config: Required<AnalyzeConfig>
    private logger = getLogger()
    private cache = getCache()

    constructor(config: Partial<AnalyzeConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config }
    }

    /**
     * Analyze all failures
     */
    async analyzeAll(
        failures: FailureInfo[],
        aiClient: AiClient,
        promptBuilder: PromptBuilder
    ): Promise<AnalysisResult[]> {
        if (failures.length === 0) {
            return []
        }

        this.logger.info(`\nAnalyzing ${failures.length} failed tests...`)

        const results: AnalysisResult[] = []

        // Check cache first
        if (this.config.useCache) {
            for (const failure of failures) {
                const cached = this.cache.get(this.cacheKey(failure.testName), failure.content)
                if (cached) {
                    results.push({
                        testName: failure.testName,
                        analysis: cached,
                    })
                }
            }

            // Remove cached failures from analysis list
            const cachedNames = new Set(results.map(r => r.testName))
            failures = failures.filter(f => !cachedNames.has(f.testName))

            if (results.length > 0) {
                this.logger.success(`${results.length} failures resolved from cache`)
            }
        }

        if (failures.length === 0) {
            return results
        }

        this.logger.info(`🔍 ${failures.length} failures require fresh analysis`)

        // Batch analysis for large number of failures
        if (failures.length > this.config.batchThreshold) {
            const batchResults = await this.analyzeBatch(failures, aiClient, promptBuilder)
            results.push(...batchResults)
        }

        // Individual analysis for remaining failures
        const remainingFailures = failures.filter((_, i) => !results[i])
        if (remainingFailures.length > 0) {
            const individualResults = await this.analyzeIndividual(
                remainingFailures,
                aiClient,
                promptBuilder
            )
            results.push(...individualResults)
        }

        return results
    }

    /**
     * Batch analysis of multiple failures
     */
    private async analyzeBatch(
        failures: FailureInfo[],
        aiClient: AiClient,
        promptBuilder: PromptBuilder
    ): Promise<AnalysisResult[]> {
        this.logger.info('Batch analyzing all failures...')

        try {
            const batchPrompt = promptBuilder.buildBatchAnalysisPrompt(
                failures.map(f => ({ testName: f.testName, errorContext: f.content })),
                this.config.includeManualVerdict
            )

            const analysis = await aiClient.ask(
                batchPrompt,
                SYSTEM_PROMPTS.BATCH,
                { maxTokens: this.config.batchMaxTokens }
            )

            const results: AnalysisResult[] = []
            
            for (const failure of failures) {
                const result = {
                    testName: failure.testName,
                    analysis: analysis.includes(failure.testName)
                        ? analysis
                        : `Analysis not found for ${failure.testName}`,
                }

                if (this.config.useCache) {
                    this.cache.set(this.cacheKey(failure.testName), failure.content, result.analysis)
                }

                results.push(result)
            }

            return results
        } catch (error) {
            this.logger.error(`Batch analysis failed: ${error}`)
            this.logger.notice('Falling back to individual analysis...')
            return []
        }
    }

    /**
     * Individual analysis of each failure
     */
    private async analyzeIndividual(
        failures: FailureInfo[],
        aiClient: AiClient,
        promptBuilder: PromptBuilder
    ): Promise<AnalysisResult[]> {
        const results: AnalysisResult[] = []

        for (let i = 0; i < failures.length; i++) {
            const failure = failures[i]
            this.logger.info(`\nAnalyzing: ${failure.testName}`)

            // Progress
            this.logger.progress(i + 1, failures.length, `${failure.testName}`)

            try {
                const prompt = promptBuilder.buildFailureAnalysisPrompt(failure.testName, failure.content, this.config.includeManualVerdict)

                const analysis = await aiClient.ask(
                    prompt,
                    SYSTEM_PROMPTS.INDIVIDUAL,
                    {
                        maxTokens: this.config.individualMaxTokens,
                        temperature: this.config.temperature,
                    }
                )

                const result = { testName: failure.testName, analysis }

                if (this.config.useCache) {
                    this.cache.set(this.cacheKey(failure.testName), failure.content, analysis)
                }

                results.push(result)

                // Delay between requests
                if (i < failures.length - 1) {
                    await new Promise(resolve => 
                        setTimeout(resolve, this.config.delayBetweenRequests)
                    )
                }
            } catch (error) {
                const errorMsg = String(error)
                this.logger.error(`Analysis failed for "${failure.testName}": ${errorMsg}`)
                results.push({ 
                    testName: failure.testName, 
                    analysis: '', 
                    error: errorMsg 
                })
            }
        }

        return results
    }

    /**
     * A cache entry from a run with includeManualVerdict=true isn't a valid
     * answer for a run with it false, and vice versa — the response shape
     * differs. Keying by testName alone (as the cache's own API takes)
     * would let pr-checks.yml's no-verdict analysis get served back to
     * full-regression.yml for the same failure within the cache's 7-day
     * window, silently dropping the verdict section — or the reverse,
     * leaking a Manual Verdict into a pr-checks.yml report. Suffixing the
     * key keeps the two variants from ever answering for each other.
     */
    private cacheKey(testName: string): string {
        return this.config.includeManualVerdict ? testName : `${testName}::no-manual-verdict`
    }

    /**
     * Get statistics from results
     */
    getStats(results: AnalysisResult[]) {
        const success = results.filter(r => !r.error).length
        const failed = results.filter(r => r.error).length
        
        return {
            total: results.length,
            success,
            failed,
            successRate: results.length > 0 
                ? Math.round((success / results.length) * 100)
                : 0,
        }
    }
}

/**
 * Factory function to create analyzer
 */
export function createAnalyzer(config?: Partial<AnalyzeConfig>): FailureAnalyzer {
    return new FailureAnalyzer(config)
}