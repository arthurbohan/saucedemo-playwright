#!/usr/bin/env node

/**
 * scripts/analyzeFailure.ts
 *
 * Entry point for failure analysis
 * Analyzes unique failures only, uses cache for efficiency
 * Outputs: ai-analysis-summary.md only
 */

import 'dotenv/config'
import { getGroqClient } from '../helpers/groq/client'
import { getCollector } from '../helpers/analyzeFailure/collector'
import { getReporter } from '../helpers/analyzeFailure/reporter'
import { getLogger } from '../helpers/analyzeFailure/logger'
import { getCache } from '../helpers/analyzeFailure/cache'
import { createAnalyzer } from '../helpers/analyzeFailure/core'
import { DEFAULT_CONFIG } from '../helpers/analyzeFailure/config'

async function main() {
    const logger = getLogger()
    logger.section('🤖 Starting Failure Analysis')

    // 1. Collect unique failures
    const collector = getCollector()
    const failures = collector.collect(true) // deduplicate = true

    if (failures.length === 0) {
        logger.notice('No failed tests found')
        process.exit(0)
    }

    const stats = collector.getStats(failures)
    logger.info(`📊 Found ${stats.total} failures (${stats.unique} unique, ${stats.duplicates} duplicates)`)

    // Show cache status
    const cache = getCache()
    const cacheStats = cache.getStats()
    logger.info(`📦 Cache: ${cacheStats.total} entries`)

    // 2. Initialize Groq client
    let groqClient
    try {
        groqClient = getGroqClient()
    } catch (error) {
        logger.error(`Failed to initialize Groq client: ${error}`)
        process.exit(1)
    }

    // 3. Analyze unique failures
    const analyzer = createAnalyzer({
        batchThreshold: DEFAULT_CONFIG.batchThreshold,
        batchMaxTokens: DEFAULT_CONFIG.batchMaxTokens,
        individualMaxTokens: DEFAULT_CONFIG.individualMaxTokens,
        temperature: DEFAULT_CONFIG.temperature,
        delayBetweenRequests: DEFAULT_CONFIG.delayBetweenRequests,
        deduplicate: true,
        useCache: true,
    })

    const results = await analyzer.analyzeAll(failures, groqClient)

    // 4. Save Markdown report only
    const reporter = getReporter()
    const outputs = reporter.exportAll(results)

    // 5. Display statistics
    const analysisStats = analyzer.getStats(results)
    logger.section('📊 Analysis Complete')
    logger.success(`Successfully analyzed: ${analysisStats.success}`)
    
    if (analysisStats.failed > 0) {
        logger.failure(`Failed to analyze: ${analysisStats.failed}`)
    }
    
    logger.info(`📈 Success rate: ${analysisStats.successRate}%`)
    
    // Show cache stats after analysis
    const newCacheStats = cache.getStats()
    logger.info(`📦 Cache now: ${newCacheStats.total} entries`)
    
    logger.info(`\n📄 Report saved: ${outputs.markdown}`)

    // 6. Exit with error code if any analysis failed
    if (analysisStats.failed > 0) {
        process.exit(1)
    }
}

main().catch(err => {
    const logger = getLogger()
    logger.failure(`Fatal: ${err}`)
    process.exit(1)
})