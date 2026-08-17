#!/usr/bin/env node

/**
 * scripts/analyzeRisk.ts
 *
 * Pre-merge risk analysis: reads the current diff (vs origin/main, or
 * uncommitted, or the last commit), cross-references it against which
 * specs already cover the changed files (static import graph), and asks
 * Groq to point out regression risk and coverage gaps.
 *
 * Usage:
 *   npx tsx scripts/analyzeRisk.ts [baseRef]
 *   npm run ai:risk -- main
 */

import 'dotenv/config'
import { getDiff } from '../helpers/git/diff'
import { findSpecFiles, buildDependencyGraph, selectImpactedSpecs } from '../helpers/testSelection'
import { analyzeRisk, saveRiskReport } from '../helpers/riskAnalysis'
import { getLogger } from '../helpers/analyzeFailure/logger'
import { getGroqClient } from '../helpers/groq/client'

async function main() {
    const logger = getLogger()
    logger.section('🤖 Starting Risk Analysis')

    const baseArg = process.argv[2]
    const { base, changedFiles, diff } = getDiff(baseArg)

    if (changedFiles.length === 0) {
        logger.notice('No changes found to analyze')
        process.exit(0)
    }

    logger.info(`Comparing against: ${base}`)
    logger.info(`Changed files (${changedFiles.length}):`)
    changedFiles.forEach(f => logger.info(`  - ${f}`))

    const specFiles = findSpecFiles()
    const graph = buildDependencyGraph(specFiles)
    const { impactedSpecs } = selectImpactedSpecs(changedFiles, graph, specFiles)

    try {
        // fail fast with a clear message, same pattern as analyzeFailure.ts
        getGroqClient()
    } catch (error) {
        logger.error(`Failed to initialize Groq client: ${error}`)
        process.exit(1)
    }

    logger.info('\nAsking Groq for risk analysis...')
    const analysis = await analyzeRisk({ base, changedFiles, impactedSpecs, diff })

    logger.group('Risk Analysis', analysis)

    const filePath = saveRiskReport(analysis, { base, changedFiles })
    logger.success(`Report saved: ${filePath}`)
}

main().catch(err => {
    const logger = getLogger()
    logger.failure(`Fatal: ${err}`)
    process.exit(1)
})
