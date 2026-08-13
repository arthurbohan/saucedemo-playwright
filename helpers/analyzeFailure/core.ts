/**
 * Core failure analysis logic
 */

import type { AnalysisResult, FailureInfo, AnalyzeConfig, GroqClient } from './types'
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
        groqClient: GroqClient
    ): Promise<AnalysisResult[]> {
        if (failures.length === 0) {
            return []
        }

        this.logger.info(`\nAnalyzing ${failures.length} failed tests...`)

        const results: AnalysisResult[] = []

        // Check cache first
        if (this.config.useCache) {
            for (const failure of failures) {
                const cached = this.cache.get(failure.testName, failure.content)
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
            const batchResults = await this.analyzeBatch(failures, groqClient)
            results.push(...batchResults)
        }

        // Individual analysis for remaining failures
        const remainingFailures = failures.filter((_, i) => !results[i])
        if (remainingFailures.length > 0) {
            const individualResults = await this.analyzeIndividual(
                remainingFailures,
                groqClient
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
        groqClient: GroqClient
    ): Promise<AnalysisResult[]> {
        this.logger.info('Batch analyzing all failures...')

        try {
            const { buildBatchAnalysisPrompt } = await import('../groq/prompts')
            
            const batchPrompt = buildBatchAnalysisPrompt(
                failures.map(f => ({ testName: f.testName, errorContext: f.content }))
            )

            const analysis = await groqClient.ask(
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
                    this.cache.set(failure.testName, failure.content, result.analysis)
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
        groqClient: GroqClient
    ): Promise<AnalysisResult[]> {
        const results: AnalysisResult[] = []

        for (let i = 0; i < failures.length; i++) {
            const failure = failures[i]
            this.logger.info(`\nAnalyzing: ${failure.testName}`)

            // Progress
            this.logger.progress(i + 1, failures.length, `${failure.testName}`)

            try {
                const { buildFailureAnalysisPrompt } = await import('../groq/prompts')
                const prompt = buildFailureAnalysisPrompt(failure.testName, failure.content)

                const analysis = await groqClient.ask(
                    prompt,
                    SYSTEM_PROMPTS.INDIVIDUAL,
                    { 
                        maxTokens: this.config.individualMaxTokens,
                        temperature: this.config.temperature,
                    }
                )

                const result = { testName: failure.testName, analysis }

                if (this.config.useCache) {
                    this.cache.set(failure.testName, failure.content, analysis)
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