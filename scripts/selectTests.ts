#!/usr/bin/env node

/**
 * scripts/selectTests.ts
 *
 * Impact-based regression selection.
 * Given what changed (vs origin/main, or uncommitted, or the last commit),
 * decides which spec files actually need to run — via a deterministic
 * static import graph, not an AI guess (see helpers/testSelection/graph.ts
 * for why).
 *
 * Usage:
 *   npx tsx scripts/selectTests.ts [baseRef]
 *   npm run ai:select -- main
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { getDiff } from '../helpers/git/diff'
import { findSpecFiles, buildDependencyGraph, selectImpactedSpecs } from '../helpers/testSelection'
import { getLogger } from '../helpers/analyzeFailure/logger'

function main() {
    const logger = getLogger()
    logger.section('🎯 Impact-Based Test Selection')

    const baseArg = process.argv[2]
    const { base, changedFiles } = getDiff(baseArg)

    logger.info(`Comparing against: ${base}`)
    logger.info(`Changed files (${changedFiles.length}):`)
    changedFiles.forEach(f => logger.info(`  - ${f}`))

    if (changedFiles.length === 0) {
        logger.notice('No changes found')
        fs.writeFileSync('impacted-specs.txt', '')
        process.exit(0)
    }

    const specFiles = findSpecFiles()
    const graph = buildDependencyGraph(specFiles)
    const result = selectImpactedSpecs(changedFiles, graph, specFiles)

    logger.info(`\n${result.reason}`)

    const outPath = path.join(process.cwd(), 'impacted-specs.txt')

    if (result.impactedSpecs.length === 0) {
        logger.success('Nothing to run — safe to skip regression for this change.')
        fs.writeFileSync(outPath, '')
        process.exit(0)
    }

    logger.info('\nImpacted specs:')
    result.impactedSpecs.forEach(f => logger.info(`  - ${f}`))
    fs.writeFileSync(outPath, result.impactedSpecs.join('\n') + '\n')

    const cmd = result.fullRegression
        ? 'npx playwright test'
        : `npx playwright test ${result.impactedSpecs.join(' ')}`

    logger.info(`\n▶ Suggested run:\n  ${cmd}`)
    logger.info(`\n📄 Spec list saved: ${outPath}`)

    if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `specs=${result.impactedSpecs.join(' ')}\n`)
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `full_regression=${result.fullRegression}\n`)
    }
}

main()
